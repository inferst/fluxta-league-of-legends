import type { Options, Source, SourceContext } from "@fluxta/sdk/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "./fixtures/synthetic-session.json";
import manifest from "../manifest.json";
import type { HttpResult, LocalIO } from "../src/observation/io";
import { endpoints, LeagueObservation } from "../src/observation/observation";
import type { EvidenceFrame } from "../src/observation/sanitizer";
import { registerLeague } from "../src/plugin";

const secret = "private-test-token+/=";
const commandLine = `"C:\\Riot Games\\LeagueClientUx.exe" "--app-port=54321" "--remoting-auth-token=${secret}"`;

function harness() {
  const sources = new Map<string, Source>();
  const options = new Map<string, Options>();
  const connections = vi.fn();
  const processes = vi.fn<LocalIO["processes"]>().mockResolvedValue([]);
  const replies = new Map<string, HttpResult>([
    [endpoints.phase, { status: 200, body: "None" }],
    [endpoints.account, { status: 200, body: fixture.account }],
    [endpoints.version, { status: 200, body: "candidate-version" }],
    [endpoints.ranked, { status: 200, body: fixture.ranked }],
    [endpoints.session, { status: 200, body: fixture.session }],
    [endpoints.live, { status: 200, body: fixture.live }],
  ]);
  const get = vi.fn<LocalIO["get"]>(
    async (_port, path) => replies.get(path) ?? { status: 404 },
  );
  const io: LocalIO = {
    platform: "win32",
    processes,
    get,
    now: Date.now,
    schedule(run, milliseconds) {
      const timer = setTimeout(run, milliseconds);
      return () => clearTimeout(timer);
    },
  };
  const observation = registerLeague(
    {
      registerSource: (source) => {
        sources.set(source.key, source);
      },
      registerOptions: (source) => {
        options.set(source.key, source);
      },
      setConnections: connections,
    },
    io,
  );
  const read = async (key: string) =>
    sources.get(key)!.resolve(undefined as unknown as SourceContext);
  const state = async () =>
    Object.fromEntries(
      await Promise.all(
        [...sources.keys()].map(async (key) => [key, await read(key)]),
      ),
    );
  const tick = (milliseconds = 1000) =>
    vi.advanceTimersByTimeAsync(milliseconds);
  return {
    sources,
    options,
    connections,
    io,
    processes,
    get,
    replies,
    observation,
    read,
    state,
    tick,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-03T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("public client/account capability", () => {
  it("declares every registered source and uses queries without an Item or external I/O", async () => {
    const h = harness();
    expect([...h.sources.keys()]).toEqual(
      manifest.sources.map((source) => source.key),
    );
    expect(await h.read("clientState")).toBe("checking");
    expect(await h.read("accountId")).toBeNull();
    expect(h.processes).not.toHaveBeenCalled();
    expect(h.get).not.toHaveBeenCalled();
    expect(h.connections).toHaveBeenLastCalledWith([
      { id: "local-client", title: "League of Legends", connected: false },
    ]);
    expect(
      await h.options.get("clientStates")!.resolve({ args: null }),
    ).toContainEqual({ value: "inaccessible", label: "inaccessible" });
  });

  it("follows absent → available → closed and replaces the active account after restart", async () => {
    const h = harness();
    h.observation.start();
    await h.tick(0);
    expect(await h.read("clientState")).toBe("absent");
    expect(h.get).not.toHaveBeenCalled();
    h.processes.mockResolvedValue([{ CommandLine: commandLine }]);
    await h.tick();
    expect(await h.state()).toEqual({
      clientState: "available",
      clientAvailable: true,
      accountState: "identified",
      accountId: fixture.account.puuid,
      accountName: "Synthetic Player#TEST",
      observedAt: "2026-11-03T12:00:01.000Z",
    });
    expect(h.get).toHaveBeenCalledWith(54321, endpoints.account, secret);
    expect(h.connections).toHaveBeenLastCalledWith([
      { id: "local-client", title: "League of Legends", connected: true },
    ]);
    h.processes.mockResolvedValue([]);
    await h.tick();
    expect(await h.read("clientAvailable")).toBe(false);
    expect(await h.read("accountId")).toBeNull();
    expect(await h.read("accountName")).toBeNull();
    h.processes.mockResolvedValue([
      {
        CommandLine: commandLine
          .replace("54321", "54322")
          .replace(secret, "new-token"),
      },
    ]);
    h.replies.set(endpoints.account, {
      status: 200,
      body: { puuid: "account-b", gameName: "Next", tagLine: "TWO" },
    });
    await h.tick();
    expect(await h.read("accountId")).toBe("account-b");
    expect(await h.read("accountName")).toBe("Next#TWO");
    expect(h.get).toHaveBeenLastCalledWith(
      54322,
      endpoints.account,
      "new-token",
    );
  });

  it("treats no game and unidentified account as a reachable client", async () => {
    const h = harness();
    h.processes.mockResolvedValue([{ CommandLine: commandLine }]);
    h.replies.set(endpoints.session, { status: 404 });
    h.replies.set(endpoints.live, { status: 0 });
    h.replies.set(endpoints.account, { status: 404 });
    h.observation.start();
    await h.tick(0);
    expect(await h.read("clientState")).toBe("available");
    expect(await h.read("accountState")).toBe("unidentified");
    expect(h.get.mock.calls.map((call) => call[1]).sort()).toEqual(
      [endpoints.phase, endpoints.account].sort(),
    );
    h.replies.set(endpoints.account, {
      status: 200,
      body: { puuid: "00000000-0000-0000", gameName: "Stale" },
    });
    await h.tick();
    expect(await h.read("accountId")).toBeNull();
    expect(await h.read("accountName")).toBeNull();
  });

  it("clears identity on HTTP failures, authentication refusal and reconnection", async () => {
    const h = harness();
    h.processes.mockResolvedValue([{ CommandLine: commandLine }]);
    h.observation.start();
    await h.tick(0);
    h.get.mockRejectedValue(new Error(`ECONNRESET ${secret}`));
    await h.tick();
    expect(await h.read("clientState")).toBe("inaccessible");
    expect(await h.read("accountId")).toBeNull();
    expect(await h.read("accountState")).toBe("unavailable");
    h.get.mockImplementation(async () => ({
      status: 401,
      body: { message: secret },
    }));
    await h.tick();
    expect(await h.read("clientAvailable")).toBe(false);
    h.get.mockImplementation(async (_port, path) => h.replies.get(path)!);
    await h.tick();
    expect(await h.read("accountId")).toBe(fixture.account.puuid);
    expect(JSON.stringify(h.connections.mock.calls)).not.toContain(secret);
  });

  it("distinguishes account failure from client failure and does not invent a Riot ID", async () => {
    const h = harness();
    h.processes.mockResolvedValue([{ CommandLine: commandLine }]);
    h.observation.start();
    await h.tick(0);
    h.replies.set(endpoints.account, { status: 503 });
    await h.tick();
    expect(await h.read("clientAvailable")).toBe(true);
    expect(await h.read("accountState")).toBe("unavailable");
    expect(await h.read("accountId")).toBeNull();
    h.replies.set(endpoints.account, {
      status: 200,
      body: { puuid: "known", displayName: "Legacy" },
    });
    await h.tick();
    expect(await h.read("accountState")).toBe("identified");
    expect(await h.read("accountName")).toBeNull();
    h.replies.set(endpoints.account, { status: 200, body: "invalid shape" });
    await h.tick();
    expect(await h.read("accountState")).toBe("unidentified");
  });

  it.each([
    [{ CommandLine: null }],
    [{ CommandLine: "--app-port=0 --remoting-auth-token=secret" }],
    [{ CommandLine: "--app-port=65536 --remoting-auth-token=secret" }],
    [{ CommandLine: "--app-port=54321" }],
    [
      {
        CommandLine:
          "--app-port=54321 --app-port=54322 --remoting-auth-token=secret",
      },
    ],
    [{ CommandLine: commandLine }, { CommandLine: commandLine }],
  ])("refuses ambiguous or unreadable discovery %j", async (...processes) => {
    const h = harness();
    h.processes.mockResolvedValue(processes);
    h.observation.start();
    await h.tick(0);
    expect(await h.read("clientState")).toBe("inaccessible");
    expect(h.get).not.toHaveBeenCalled();
  });

  it("handles discovery failures without leaking command output or retaining an account", async () => {
    const h = harness();
    h.processes.mockResolvedValue([{ CommandLine: commandLine }]);
    h.observation.start();
    await h.tick(0);
    h.processes.mockRejectedValue({ stdout: commandLine, stderr: secret });
    await h.tick();
    expect(await h.read("clientState")).toBe("inaccessible");
    expect(JSON.stringify(await h.state())).not.toContain(secret);
    expect(await h.read("accountId")).toBeNull();
  });

  it("reports unsupported platforms without executing discovery", async () => {
    const h = harness();
    h.io.platform = "darwin";
    h.observation.start();
    await h.tick(0);
    expect(await h.read("clientState")).toBe("unsupported");
    expect(h.processes).not.toHaveBeenCalled();
  });

  it("does not overlap slow acquisition and drops observations after stop", async () => {
    const h = harness();
    let finish!: (result: unknown) => void;
    h.processes.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    h.observation.start();
    h.observation.start();
    await h.tick(5000);
    expect(h.processes).toHaveBeenCalledTimes(1);
    h.observation.stop();
    finish([{ CommandLine: commandLine }]);
    await h.tick(0);
    expect(await h.read("clientState")).toBe("checking");
    expect(h.connections).toHaveBeenCalledTimes(1);
    await h.tick(10000);
    expect(h.processes).toHaveBeenCalledTimes(1);
  });
});

describe("acquisition capture uses the same real observation path", () => {
  it("preserves distinct queue inputs, lifecycle and roster fields, while sanitizing identities and secrets", async () => {
    const h = harness();
    h.processes.mockResolvedValue([{ CommandLine: commandLine }]);
    h.replies.set(endpoints.ranked, {
      status: 200,
      body: { ...fixture.ranked, secret, authentication: { token: secret } },
    });
    h.replies.set(endpoints.version, {
      status: 200,
      body: `version-${secret}`,
    });
    const frames: EvidenceFrame[] = [];
    const observation = new LeagueObservation(
      h.io,
      () => {},
      (frame) => {
        frames.push(frame);
      },
    );
    observation.start();
    await h.tick(0);
    const frame = frames[0];
    expect(frame.clientState).toBe("available");
    expect(h.get).toHaveBeenCalledWith(2999, endpoints.live, undefined);
    const data = (path: string) =>
      frame.requests.find((request) => request.endpoint === path)!.data;
    const ranked = data(endpoints.ranked) as {
      queues: { queueType: string; leaguePoints: number }[];
    };
    expect(ranked.queues.map((queue) => queue.queueType)).toEqual([
      "RANKED_SOLO_5x5",
      "RANKED_FLEX_SR",
    ]);
    expect(ranked.queues[0].leaguePoints).toBe(0);
    const account = data(endpoints.account) as {
      gameName: string;
      tagLine: string;
      puuid: string;
    };
    const live = data(endpoints.live) as {
      activePlayer: { riotId: string };
      allPlayers: { isDead: boolean; scores: { kills: number } }[];
      events: { Events: { KillerName?: string }[] };
    };
    expect(live.activePlayer.riotId).toBe(
      `${account.gameName}#${account.tagLine}`,
    );
    expect(live.events.Events[1].KillerName).toBe(live.activePlayer.riotId);
    expect(live.allPlayers[0].isDead).toBe(false);
    expect(live.allPlayers[0].scores.kills).toBe(0);
    const text = JSON.stringify(frame);
    for (const privateValue of [
      secret,
      Buffer.from(`riot:${secret}`).toString("base64"),
      fixture.account.puuid,
      fixture.account.gameName,
      fixture.account.displayName,
      "CommandLine",
    ])
      expect(text).not.toContain(privateValue);
    expect(text).toContain("[redacted]");
    expect(text).toContain("championId");
    expect(text).toContain("ChampionKill");
  });

  it("records absent game, endpoint failure and partial rosters without filling missing values", async () => {
    const h = harness();
    h.processes.mockResolvedValue([{ CommandLine: commandLine }]);
    h.replies.set(endpoints.live, { status: 0, body: { error: secret } });
    h.replies.set(endpoints.session, {
      status: 200,
      body: {
        phase: "GameStart",
        gameData: { teamOne: [{ championId: 0 }], teamTwo: [] },
      },
    });
    const frames: EvidenceFrame[] = [];
    const observation = new LeagueObservation(
      h.io,
      () => {},
      (frame) => {
        frames.push(frame);
      },
    );
    observation.start();
    await h.tick(0);
    expect(frames[0].clientState).toBe("available");
    expect(
      frames[0].requests.find((request) => request.endpoint === endpoints.live),
    ).toMatchObject({ status: 0, data: null });
    const session = frames[0].requests.find(
      (request) => request.endpoint === endpoints.session,
    )!.data;
    expect(session).toMatchObject({
      phase: "GameStart",
      gameData: { teamOne: [{ championId: 0 }], teamTwo: [] },
    });
    expect(JSON.stringify(session)).not.toContain("puuid");
  });
});

import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import fixture from "./fixtures/synthetic-session.json";
import { compactCapture } from "../src/observation/compact";
import { endpoints } from "../src/observation/observation";
import {
  EvidenceSanitizer,
  type EvidenceFrame,
  type EndpointObservation,
} from "../src/observation/sanitizer";

// Synthetic file inputs only. These tests never establish actual-client evidence.
const at = (second: number) =>
  new Date(Date.UTC(2026, 10, 3, 12, 0, second)).toISOString();
const header = {
  schemaVersion: 1,
  kind: "windows-acquisition",
  synthetic: true,
  capturedAt: at(0),
};
const sanitizer = new EvidenceSanitizer();
const projected = {
  account: sanitizer.endpoint(endpoints.account, fixture.account),
  ranked: sanitizer.endpoint(endpoints.ranked, fixture.ranked),
  session: sanitizer.endpoint(endpoints.session, fixture.session),
  live: sanitizer.endpoint(endpoints.live, fixture.live),
};

function frame(second: number): EvidenceFrame {
  const get = (endpoint: string, data: unknown): EndpointObservation => ({
    endpoint,
    startedAt: at(second),
    finishedAt: at(second),
    status: 200,
    data: data as EndpointObservation["data"],
  });
  const live = structuredClone(projected.live) as {
    gameData: { gameTime: number };
    allPlayers: {
      level: number;
      isDead: boolean;
      scores?: { kills: number };
    }[];
  };
  live.gameData.gameTime = second;
  for (const player of live.allPlayers) {
    player.level = (second % 18) + 1;
    player.isDead = second % 2 === 0;
    if (player.scores) player.scores.kills = second;
  }
  if (second % 2 === 0) live.allPlayers.reverse();
  return {
    startedAt: at(second),
    observedAt: at(second),
    clientState: "available",
    accountState: "identified",
    requests: [
      get(endpoints.account, projected.account),
      get(endpoints.ranked, projected.ranked),
      get(endpoints.session, projected.session),
      get(endpoints.phase, "InProgress"),
      get(endpoints.live, live),
    ],
  };
}

const directories: string[] = [];
afterEach(async () => {
  // mkdtemp returns a fresh test-owned directory directly under tmpdir.
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

async function setup(rows: unknown[], ending = "\n") {
  const directory = await mkdtemp(join(tmpdir(), "lol-compact-"));
  directories.push(directory);
  const input = join(directory, "capture.jsonl");
  const out = join(directory, "compact");
  const source = rows.map((row) => JSON.stringify(row)).join("\n") + ending;
  await writeFile(input, source);
  await mkdir(out);
  return { input, out, source };
}

async function jsonl(path: string): Promise<Record<string, unknown>[]> {
  const text = await readFile(path, "utf8");
  return text.trim()
    ? text
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as Record<string, unknown>)
    : [];
}

describe("streaming capture compaction", () => {
  it("reduces 40 minutes of clock/stat ticks to boundary frames and preserves exact selected JSON lines", async () => {
    const { input, out, source } = await setup([
      header,
      ...Array.from({ length: 2400 }, (_, second) => frame(second)),
    ]);
    await compactCapture(input, out);
    const index = await jsonl(join(out, "evidence-index.jsonl"));
    expect(index.map((row) => row.sourceLine)).toEqual([1, 2, 3, 2400, 2401]);
    const evidence = (await readFile(join(out, "evidence.jsonl"), "utf8"))
      .trimEnd()
      .split("\n");
    const original = source.trimEnd().split("\n");
    index.forEach((row, i) =>
      expect(evidence[i]).toBe(original[Number(row.sourceLine) - 1]),
    );
    expect(await readFile(input, "utf8")).toBe(source);
    expect(JSON.parse(evidence[0]).synthetic).toBe(true);
    const summary = await readFile(join(out, "summary.md"), "utf8");
    expect(summary).toContain("SYNTHETIC INPUT");
    expect(summary).toContain("Retained frames: 4 / 2400");
    expect(summary).toContain("Frame reduction: 99.8%");
    expect(summary).toContain(
      createHash("sha256").update(source).digest("hex"),
    );
    expect(summary).toContain("Roster Ready");
    expect(summary).not.toContain(fixture.account.puuid);
    expect(await jsonl(join(out, "events.jsonl"))).toHaveLength(2);
  });

  it.each([
    [
      "account-identity",
      endpoints.account,
      { puuid: "puuid-2", gameName: "player-2", tagLine: "tag-1" },
    ],
    [
      "ranked-input",
      endpoints.ranked,
      { queues: [{ queueType: "RANKED_SOLO_5x5", leaguePoints: 0 }] },
    ],
    ["lifecycle", endpoints.phase, "GameStart"],
    [
      "session-metadata",
      endpoints.session,
      { gameData: { gameId: 2, queue: { id: 440 } } },
    ],
    [
      "lcu-roster",
      endpoints.session,
      {
        gameData: {
          teamOne: [{ puuid: "puuid-1", championId: 0 }],
          teamTwo: [],
        },
      },
    ],
    [
      "live-roster",
      endpoints.live,
      { activePlayer: { riotId: "player-2#tag-1" }, allPlayers: [] },
    ],
  ])(
    "retains %s changes and both neighbors",
    async (reason, endpoint, data) => {
      const frames = Array.from({ length: 12 }, (_, second) => frame(second));
      const request = frames[6].requests.find(
        (request) => request.endpoint === endpoint,
      )!;
      request.data = data as EndpointObservation["data"];
      const { input, out } = await setup([header, ...frames]);
      await compactCapture(input, out);
      const index = await jsonl(join(out, "evidence-index.jsonl"));
      expect(index.find((row) => row.sourceLine === 8)?.reasons).toContain(
        reason,
      );
      expect(index.map((row) => row.sourceLine)).toEqual(
        expect.arrayContaining([7, 8, 9]),
      );
    },
  );

  it("retains HTTP failure/recovery and distinguishes null, empty, zero and explicit unranked inputs", async () => {
    const frames = Array.from({ length: 8 }, (_, second) => frame(second));
    const bodies: EndpointObservation["data"][] = [
      null,
      {},
      { queues: [] },
      { queues: [{ tier: "NONE", leaguePoints: 0 }] },
    ];
    frames.slice(1, 5).forEach((frame, index) => {
      frame.requests.find(
        (request) => request.endpoint === endpoints.ranked,
      )!.data = bodies[index];
    });
    frames[5].requests.find(
      (request) => request.endpoint === endpoints.account,
    )!.status = 503;
    const { input, out } = await setup([header, ...frames]);
    await compactCapture(input, out, 0);
    const index = await jsonl(join(out, "evidence-index.jsonl"));
    for (const line of [3, 4, 5, 6])
      expect(index.find((row) => row.sourceLine === line)?.reasons).toContain(
        "ranked-input",
      );
    for (const line of [7, 8])
      expect(index.find((row) => row.sourceLine === line)?.reasons).toContain(
        "http-status",
      );
    const rows = await jsonl(join(out, "evidence.jsonl"));
    expect(rows).toHaveLength(index.length);
    expect(await readFile(join(out, "summary.md"), "utf8")).toContain(
      "Manual evidence still required",
    );
  });

  it("deduplicates events across a transport interruption, retains revisions and scopes reused EventID zero to a new game", async () => {
    const frames = Array.from({ length: 6 }, (_, second) => frame(second + 10));
    frames[1].requests.find(
      (request) => request.endpoint === endpoints.live,
    )!.status = 0;
    const changed = frames[3].requests.find(
      (request) => request.endpoint === endpoints.live,
    )!.data as { events: { Events: { Assisters?: string[] }[] } };
    changed.events.Events[1].Assisters = ["player-3#tag-1"];
    for (const row of frames.slice(4)) {
      (
        row.requests.find((request) => request.endpoint === endpoints.session)!
          .data as { gameData: { gameId: number } }
      ).gameData.gameId = 2;
      (
        row.requests.find((request) => request.endpoint === endpoints.live)!
          .data as { gameData: { gameTime: number } }
      ).gameData.gameTime = 1;
    }
    const { input, out } = await setup([header, ...frames]);
    await compactCapture(input, out, 0);
    const events = await jsonl(join(out, "events.jsonl"));
    expect(events).toHaveLength(5);
    expect(events.map((event) => [event.segment, event.revision])).toEqual([
      [1, 1],
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 1],
    ]);
    expect(events[2].sourceLine).toBe(5);
    expect(events[2].requestStartedAt).toBe(at(13));
    expect((events[3].event as { EventID: number }).EventID).toBe(0);
  });

  it("detects Live-only game resets, missing event ids and gaps already lost by the collector", async () => {
    const frames = [frame(20), frame(21), frame(22)];
    for (const row of frames) {
      row.requests = row.requests.filter(
        (request) => request.endpoint !== endpoints.session,
      );
      const live = row.requests.find(
        (request) => request.endpoint === endpoints.live,
      )!.data as {
        gameData: { gameTime: number };
        events: { Events: object[]; _totalEvents: number };
      };
      live.events = {
        Events: [{ EventName: "GameStart", EventTime: 0 }],
        _totalEvents: 100,
      };
      if (row === frames[2]) live.gameData.gameTime = 0;
    }
    const { input, out } = await setup([header, ...frames]);
    await compactCapture(input, out);
    const events = await jsonl(join(out, "events.jsonl"));
    expect(events.map((event) => event.segment)).toEqual([1, 2]);
    expect(await readFile(join(out, "summary.md"), "utf8")).toContain(
      "Potential event-window gaps: 2",
    );
  });

  it("refuses truncated/foreign captures without a success summary, and never overwrites existing evidence", async () => {
    const { input, out, source } = await setup(
      [header, frame(0)],
      '\n{"unfinished":',
    );
    await expect(compactCapture(input, out)).rejects.toThrow();
    await expect(readFile(join(out, "summary.md"))).rejects.toThrow();
    expect(await readFile(input, "utf8")).toBe(source);
    const second = await setup([{ at: at(0), client: "absent" }]);
    await expect(compactCapture(second.input, second.out)).rejects.toThrow();
    await expect(readFile(join(second.out, "summary.md"))).rejects.toThrow();
    const third = await setup([header, frame(0)]);
    await writeFile(join(third.out, "evidence.jsonl"), "keep me");
    await expect(compactCapture(third.input, third.out)).rejects.toThrow();
    expect(await readFile(join(third.out, "evidence.jsonl"), "utf8")).toBe(
      "keep me",
    );
  });
});

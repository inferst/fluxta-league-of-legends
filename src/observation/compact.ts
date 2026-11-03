import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { open, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { endpoints } from "./observation";
import { AcquisitionReport } from "./report";
import type { EndpointObservation, EvidenceFrame } from "./sanitizer";

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function canonical(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item !== null && typeof item === "object")
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => [key, normalize(value)]),
      );
    return item;
  };
  return JSON.stringify(normalize(value));
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function pick(value: unknown, keys: string[]): Record<string, unknown> {
  const obj = object(value);
  return Object.fromEntries(
    keys.filter((key) => key in obj).map((key) => [key, obj[key]]),
  );
}

function shape(value: unknown): unknown {
  if (Array.isArray(value))
    return [...new Set(value.map((item) => canonical(shape(item))))].sort();
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "_observedKeys" ? item : shape(item),
      ]),
    );
  return value === null ? "null" : typeof value;
}

const identity = [
  "puuid",
  "summonerId",
  "accountId",
  "gameName",
  "tagLine",
  "riotId",
  "riotIdGameName",
  "riotIdTagLine",
  "summonerName",
  "displayName",
];

function roster(value: unknown, live: boolean): unknown {
  if (!Array.isArray(value)) return value ?? "missing";
  const fields = [
    ...identity,
    ...(live
      ? ["championName", "rawChampionName", "team", "position"]
      : ["championId", "selectedPosition", "teamParticipantId"]),
  ];
  return value.map((player) => canonical(pick(player, fields))).sort();
}

/** Chooses evidence, never decides rank, supported matches or Roster Ready. */
class Changes {
  private previous = new Map<string, string>();
  private contracts = new Map<string, Set<string>>();
  private eventTypes = new Set<string>();
  private events = new Map<string, { signature: string; revision: number }>();
  private gameId?: string;
  private gameTime?: number;
  private eventTotal?: number;
  private liveAvailable = false;
  segment = 0;
  eventRecords = 0;
  eventDuplicates = 0;
  eventGaps = 0;

  frame(frame: EvidenceFrame): { reasons: Set<string>; events: object[] } {
    const reasons = new Set<string>();
    const changed = (key: string, value: unknown) => {
      const signature = fingerprint(value);
      if (this.previous.get(key) !== signature) reasons.add(key);
      this.previous.set(key, signature);
    };
    changed("client/account-state", [frame.clientState, frame.accountState]);
    changed(
      "http-status",
      [...frame.requests]
        .map((request) => [request.endpoint, request.status])
        .sort(([a], [b]) => String(a).localeCompare(String(b))),
    );
    const byEndpoint = new Map(
      frame.requests.map((request) => [request.endpoint, request]),
    );
    const successful = (endpoint: string): EndpointObservation | undefined => {
      const request = byEndpoint.get(endpoint);
      return request?.status === 200 ? request : undefined;
    };
    for (const request of frame.requests) {
      if (request.status !== 200) continue;
      const seen = this.contracts.get(request.endpoint) ?? new Set<string>();
      const signature = fingerprint(shape(request.data));
      if (!seen.has(signature)) reasons.add("new-response-shape");
      seen.add(signature);
      this.contracts.set(request.endpoint, seen);
    }
    const account = successful(endpoints.account);
    // Missing identity is fingerprinted too; a previous account never fills it.
    changed("account-identity", account ? pick(account.data, identity) : null);
    const ranked = successful(endpoints.ranked);
    if (ranked) {
      const data = object(ranked.data);
      changed(
        "ranked-input",
        ranked.data === null
          ? null
          : {
              ...data,
              ...(Array.isArray(data.queues)
                ? { queues: data.queues.map(canonical).sort() }
                : {}),
            },
      );
    }
    const version = successful(endpoints.version);
    if (version) changed("version", version.data);
    const phase = successful(endpoints.phase);
    if (phase) changed("lifecycle", phase.data);
    const session = successful(endpoints.session);
    const game = object(object(session?.data).gameData);
    if (session) {
      changed("session-metadata", {
        phase: object(session.data).phase ?? null,
        ...pick(game, ["gameId", "mapId", "gameMode", "queue", "isCustomGame"]),
      });
      changed("lcu-roster", [
        roster(game.teamOne, false),
        roster(game.teamTwo, false),
      ]);
    }
    const live = successful(endpoints.live);
    const data = object(live?.data);
    const liveGame = object(data.gameData);
    const time =
      typeof liveGame.gameTime === "number" &&
      Number.isFinite(liveGame.gameTime)
        ? liveGame.gameTime
        : undefined;
    const eventData = object(data.events);
    const total =
      typeof eventData._totalEvents === "number" &&
      Number.isSafeInteger(eventData._totalEvents) &&
      eventData._totalEvents >= 0
        ? eventData._totalEvents
        : undefined;
    const gameId =
      typeof game.gameId === "number" && game.gameId > 0
        ? String(game.gameId)
        : undefined;
    const boundary =
      (gameId !== undefined &&
        this.gameId !== undefined &&
        gameId !== this.gameId) ||
      (time !== undefined &&
        this.gameTime !== undefined &&
        time < this.gameTime) ||
      (total !== undefined &&
        this.eventTotal !== undefined &&
        total < this.eventTotal) ||
      (live !== undefined &&
        !this.liveAvailable &&
        this.segment > 0 &&
        (time === undefined || this.gameTime === undefined));
    if (boundary) {
      this.events.clear();
      this.eventTypes.clear();
      this.gameTime = undefined;
      this.eventTotal = undefined;
      this.segment++;
      reasons.add("observation-segment");
    }
    if (gameId !== undefined) this.gameId = gameId;
    this.liveAvailable = live !== undefined;
    if (!live) return { reasons, events: [] };
    if (this.segment === 0) this.segment = 1;
    changed(
      "live-game-metadata",
      pick(liveGame, ["gameMode", "mapName", "mapNumber", "mapTerrain"]),
    );
    changed("live-roster", {
      activePlayer: pick(data.activePlayer, identity),
      allPlayers: roster(data.allPlayers, true),
    });
    const events: object[] = [];
    const entries = Array.isArray(eventData.Events) ? eventData.Events : [];
    if (
      total !== undefined &&
      total - (this.eventTotal ?? 0) > entries.length
    ) {
      this.eventGaps++;
      reasons.add("event-window-gap");
    }
    for (const value of entries) {
      const event = object(value);
      const signature = fingerprint(event);
      const id =
        typeof event.EventID === "number" &&
        Number.isSafeInteger(event.EventID) &&
        event.EventID >= 0
          ? `id:${event.EventID}`
          : `data:${signature}`;
      const previous = this.events.get(id);
      if (previous?.signature === signature) {
        this.eventDuplicates++;
        continue;
      }
      const revision = (previous?.revision ?? 0) + 1;
      this.events.set(id, { signature, revision });
      this.eventRecords++;
      const type = fingerprint(event.EventName ?? null);
      if (!this.eventTypes.has(type)) reasons.add("first-event-type");
      this.eventTypes.add(type);
      if (revision > 1) reasons.add("event-revision");
      events.push({
        segment: this.segment,
        revision,
        requestStartedAt: live.startedAt,
        requestFinishedAt: live.finishedAt,
        gameTime: time ?? null,
        event: value,
      });
    }
    if (time !== undefined) this.gameTime = time;
    if (total !== undefined) this.eventTotal = total;
    return { reasons, events };
  }
}

type Pending = { sourceLine: number; raw: string; reasons: Set<string> };

/** Reads one line at a time; memory excludes the full capture and selected rows. */
export async function compactCapture(
  input: string,
  out: string,
  context = 1,
): Promise<void> {
  if (!Number.isInteger(context) || context < 0 || context > 5)
    throw new Error("Invalid context size");
  const original = await stat(input);
  const files: Awaited<ReturnType<typeof open>>[] = [];
  try {
    // All artifacts are exclusive creates; a failed run has no summary.md.
    for (const name of [
      "evidence.jsonl",
      "evidence-index.jsonl",
      "events.jsonl",
    ])
      files.push(await open(join(out, name), "wx"));
    const [evidence, index, events] = files;
    const report = new AcquisitionReport();
    const changes = new Changes();
    const hash = createHash("sha256");
    const inputStream = createReadStream(input);
    inputStream.on("data", (chunk) => hash.update(chunk));
    const lines = createInterface({ input: inputStream, crlfDelay: Infinity });
    const pending: Pending[] = [];
    const reasonCounts = new Map<string, number>();
    let sourceLine = 0;
    let evidenceLine = 0;
    let evidenceBytes = 0;
    let following = 0;
    const emit = async (row: Pending) => {
      if (row.reasons.size === 0) return;
      evidenceLine++;
      const text = `${row.raw}\n`;
      evidenceBytes += Buffer.byteLength(text);
      await evidence.writeFile(text);
      await index.writeFile(
        `${JSON.stringify({ evidenceLine, sourceLine: row.sourceLine, reasons: [...row.reasons].sort() })}\n`,
      );
      for (const reason of row.reasons)
        reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    };
    try {
      for await (const raw of lines) {
        sourceLine++;
        const value: unknown = JSON.parse(raw.replace(/^\uFEFF/, ""));
        report.add(value, sourceLine);
        if (sourceLine === 1) {
          await emit({ sourceLine, raw, reasons: new Set(["header"]) });
          continue;
        }
        const selection = changes.frame(value as EvidenceFrame);
        if (sourceLine === 2) selection.reasons.add("first-frame");
        const significant = selection.reasons.size > 0;
        if (following > 0) {
          selection.reasons.add("after-change");
          following--;
        }
        if (significant) {
          if (context > 0)
            for (const row of pending.slice(-context))
              row.reasons.add("before-change");
          following = context;
        }
        pending.push({ sourceLine, raw, reasons: selection.reasons });
        for (const event of selection.events)
          await events.writeFile(
            `${JSON.stringify({ sourceLine, ...event })}\n`,
          );
        while (pending.length > context + 1) await emit(pending.shift()!);
      }
    } finally {
      lines.close();
      inputStream.destroy();
    }
    const last = pending.at(-1);
    if (last) {
      last.reasons.add("last-frame");
      for (const row of pending.slice(0, -1))
        row.reasons.add("before-last-frame");
    }
    for (const row of pending) await emit(row);
    const after = await stat(input);
    if (after.size !== original.size || after.mtimeMs !== original.mtimeMs)
      throw new Error("Capture changed during compaction");
    const digest = hash.digest("hex");
    const frames = Math.max(0, sourceLine - 1);
    const retained = Math.max(0, evidenceLine - 1);
    const stats = [
      "## Compact evidence",
      "",
      `- Source SHA-256: ${digest}`,
      `- Source bytes: ${original.size}`,
      `- Retained frames: ${retained} / ${frames}`,
      `- Evidence bytes: ${evidenceBytes}`,
      `- Frame reduction: ${frames === 0 ? "0.0" : (100 * (1 - retained / frames)).toFixed(1)}%`,
      `- Neighbor frames before/after a change: ${context}`,
      `- Event records (including revisions): ${changes.eventRecords}`,
      `- Repeated event observations removed: ${changes.eventDuplicates}`,
      `- Potential event-window gaps: ${changes.eventGaps}`,
      "",
      "Start analysis with this summary, then evidence-index.jsonl to locate selected original frames in evidence.jsonl. Read events.jsonl for deduplicated native events. report.md contains the original observation inventory.",
      "",
      "evidence.jsonl retains full original JSONL line contents in source order (line endings normalized to LF). evidence-index.jsonl maps each evidence line to its 1-based sourceLine and selection reasons. Header/provenance, request timestamps, HTTP statuses and capture metadata are preserved. The full source file is unchanged.",
      "",
      "Events are scoped to conservative observation segments, not verified matches. A changed observed LCU game id, backwards Live clock/event count, or an ambiguous Live recovery starts a segment. Same-id payload corrections are retained as revisions; events without an id use their complete payload. Full neighboring frames can still contain repeated events. Gaps already lost by the collector's last-50-event window cannot be reconstructed.",
      "",
      "Roster rows are selected when identities/champions/team/position availability changes; score, level, death and clock ticks alone are omitted. Selection does not establish final champions, a cross-API identity join, Roster Ready or a supported match. Work with the complete source for omitted observations and manual action timing.",
      "",
      "| Selection reason | Retained lines |",
      "| --- | --- |",
      ...[...reasonCounts]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([reason, count]) => `| ${reason} | ${count} |`),
      "",
    ].join("\n");
    const inventory = report.markdown();
    await writeFile(join(out, "report.md"), inventory, { flag: "wx" });
    await writeFile(join(out, "summary.md"), `${inventory}\n${stats}`, {
      flag: "wx",
    });
  } finally {
    await Promise.all(files.map((file) => file.close()));
  }
}

import { endpoints } from "./observation";

function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function timestamp(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error("Invalid capture timestamp");
  return value;
}

/** Inventories collector evidence without reinterpreting accounts or matches. */
export class AcquisitionReport {
  private header?: { synthetic: boolean; capturedAt: string };
  private frames = 0;
  private lastAt?: string;
  private states = new Set<string>();
  private transitions: string[] = [];
  private transitionCount = 0;
  private previous?: string;
  private requests = new Map<string, Map<number, number>>();
  private phases = new Set<string>();
  private queueIds = new Set<number>();
  private rankedShapes = new Set<string>();

  add(input: unknown, line: number): void {
    const value = object(input);
    if (!this.header) {
      if (
        line !== 1 ||
        value.schemaVersion !== 1 ||
        value.kind !== "windows-acquisition" ||
        typeof value.synthetic !== "boolean"
      )
        throw new Error("Expected a version 1 acquisition capture header");
      this.header = {
        synthetic: value.synthetic,
        capturedAt: timestamp(value.capturedAt),
      };
      return;
    }
    if (
      !["absent", "available", "inaccessible", "unsupported"].includes(
        String(value.clientState),
      ) ||
      !["identified", "unidentified", "unavailable"].includes(
        String(value.accountState),
      ) ||
      !Array.isArray(value.requests)
    )
      throw new Error("Invalid acquisition frame");
    const at = timestamp(value.observedAt);
    if (this.lastAt && at < this.lastAt)
      throw new Error("Capture timestamps are out of order");
    this.lastAt = at;
    this.frames++;
    const state = `${value.clientState} / ${value.accountState}`;
    this.states.add(state);
    if (state !== this.previous) {
      this.transitionCount++;
      if (this.transitions.length < 100)
        this.transitions.push(`| ${line} | ${at} | ${state} |`);
      this.previous = state;
    }
    for (const item of value.requests) {
      const request = object(item);
      if (
        !Object.values(endpoints).includes(
          request.endpoint as (typeof endpoints)[keyof typeof endpoints],
        ) ||
        !Number.isInteger(request.status) ||
        (request.status as number) < 0 ||
        (request.status as number) > 599
      )
        throw new Error("Invalid acquisition request");
      const endpoint = request.endpoint as string;
      const status = request.status as number;
      const statuses = this.requests.get(endpoint) ?? new Map<number, number>();
      statuses.set(status, (statuses.get(status) ?? 0) + 1);
      this.requests.set(endpoint, statuses);
      if (status !== 200) continue;
      const data = object(request.data);
      // Only recognize documented candidate labels; never copy arbitrary strings.
      if (endpoint === endpoints.phase) {
        const phases = [
          "None",
          "Lobby",
          "Matchmaking",
          "ReadyCheck",
          "ChampSelect",
          "GameStart",
          "InProgress",
          "WaitingForStats",
          "PreEndOfGame",
          "EndOfGame",
          "Reconnect",
        ];
        this.phases.add(
          phases.includes(String(request.data))
            ? String(request.data)
            : "other/unknown",
        );
      }
      if (endpoint === endpoints.session) {
        const id = object(object(data.gameData).queue).id;
        if (typeof id === "number" && Number.isSafeInteger(id) && id >= 0)
          this.queueIds.add(id);
      }
      if (endpoint === endpoints.ranked) {
        if (Array.isArray(data.queues)) this.rankedShapes.add("queues array");
        if (data.queueMap !== null && typeof data.queueMap === "object")
          this.rankedShapes.add("queueMap object");
      }
    }
  }

  markdown(): string {
    if (!this.header) throw new Error("Empty capture");
    const status = this.header.synthetic
      ? "SYNTHETIC INPUT — not real-client evidence."
      : "PARTIAL — collector observations; public Fluxta checks still pending.";
    const list = (values: Iterable<string | number>) =>
      [...values].join(", ") || "Not observed";
    const requestRows = [...this.requests]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([endpoint, statuses]) =>
          `| \`${endpoint}\` | ${[...statuses]
            .sort(([a], [b]) => a - b)
            .map(([status, count]) => `${status}: ${count}`)
            .join(", ")} |`,
      );
    return [
      "# Windows acquisition session",
      "",
      `Status: ${status}`,
      "",
      `- Capture started UTC: ${this.header.capturedAt}`,
      `- Last completed observation UTC: ${this.lastAt ?? "Not observed"}`,
      `- Completed frames: ${this.frames}`,
      `- Client/account states: ${list(this.states)}`,
      `- Recognized lifecycle values: ${list(this.phases)}`,
      `- Observed queue ids: ${list(this.queueIds)}`,
      `- Successful ranked response shapes: ${list(this.rankedShapes)}`,
      "",
      "## Client/account transitions",
      "",
      "Times are completed collector polls, not exact user-action times or Fluxta Source latency.",
      "",
      "| Capture line | Completed UTC | Collector state |",
      "| --- | --- | --- |",
      ...this.transitions,
      "",
      ...(this.transitionCount > 100
        ? [
            `Only the first 100 of ${this.transitionCount} transitions are listed.`,
            "",
          ]
        : []),
      "## Request inventory",
      "",
      "Counts describe observations, not passed acceptance checks. Status 0 is a transport failure.",
      "",
      "| Endpoint | Status: observation count |",
      "| --- | --- |",
      ...requestRows,
      "",
      "## Manual evidence still required",
      "",
      "- Public Sources and External Connections in Fluxta, including missing account values and recovery after Fluxta restart.",
      "- Current account/Riot ID matches the visible client; sign-out, account change, temporary API failure and client restart.",
      "- Visible Windows, League/patch and Fluxta versions; process elevation and manual UTC action notes.",
      "- Separate normal, Solo/Duo and Flex runs; visible ranks and observed unranked versus unavailable responses.",
      "- Final champions, both teams, account association and first complete roster during loading or in-map, with request timestamps/game time.",
      "- Native game happenings, missing fields, reviewed representative capture lines and explicit reasons for skipped checks.",
      "",
      "The collector uses the plugin observation capability independently of Fluxta. Its states do not establish values returned by Sources in the host.",
      "",
      "Use docs/acquisition/windows-runbook.md and windows-results-template.md to complete the evidence. Review capture.jsonl before sharing; this summary never copies identities or unrestricted API data.",
      "",
    ].join("\n");
  }
}

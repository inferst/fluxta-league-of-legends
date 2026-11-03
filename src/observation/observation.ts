import type { HttpResult, LocalIO } from "./io";
import {
  EvidenceSanitizer,
  type EvidenceFrame,
  type EndpointObservation,
} from "./sanitizer";

export const endpoints = {
  phase: "/lol-gameflow/v1/gameflow-phase",
  account: "/lol-summoner/v1/current-summoner",
  version: "/lol-patch/v1/game-version",
  ranked: "/lol-ranked/v1/current-ranked-stats",
  session: "/lol-gameflow/v1/session",
  live: "/liveclientdata/allgamedata",
} as const;

export type ClientState =
  "checking" | "absent" | "available" | "inaccessible" | "unsupported";
export type AccountState = "identified" | "unidentified" | "unavailable";
export type ClientObservation = {
  clientState: ClientState;
  clientAvailable: boolean;
  accountState: AccountState;
  accountId: string | null;
  accountName: string | null;
  observedAt: string | null;
};

type Credentials = { port: number; password: string };

/** One owner for discovery, account interpretation, polling and probe inputs. */
export class LeagueObservation {
  private current: ClientObservation = {
    clientState: "checking",
    clientAvailable: false,
    accountState: "unavailable",
    accountId: null,
    accountName: null,
    observedAt: null,
  };
  private running = false;
  private cancel?: () => void;
  private generation = 0;
  private readonly sanitizer = new EvidenceSanitizer();

  constructor(
    private readonly io: LocalIO,
    private readonly changed: (state: ClientObservation) => void,
    private readonly evidence?: (frame: EvidenceFrame) => void,
  ) {}

  state(): Readonly<ClientObservation> {
    return this.current;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const generation = ++this.generation;
    const cycle = async () => {
      const result = await this.read();
      if (!this.running || generation !== this.generation) return;
      this.current = result.state;
      this.changed(this.current);
      if (result.evidence) this.evidence?.(result.evidence);
      // Serial polling: a slow/failed request cannot overlap a newer identity.
      this.cancel = this.io.schedule(() => void cycle(), 1000);
    };
    void cycle();
  }

  stop(): void {
    this.running = false;
    this.generation++;
    this.cancel?.();
  }

  private async read(): Promise<{
    state: ClientObservation;
    evidence?: EvidenceFrame;
  }> {
    const startedAt = new Date(this.io.now()).toISOString();
    let clientState: ClientState = "inaccessible";
    let credentials: Credentials | undefined;
    if (this.io.platform !== "win32") {
      clientState = "unsupported";
    } else {
      try {
        const processes = await this.io.processes();
        if (Array.isArray(processes) && processes.length === 0) {
          clientState = "absent";
        } else if (Array.isArray(processes) && processes.length === 1) {
          credentials = credentialsFrom(processes[0]);
        }
        // Multiple clients or unreadable process data cannot select an account.
      } catch {
        // Raw discovery errors can include command lines. Drop them here.
      }
    }

    const observations: EndpointObservation[] = [];
    const get = async (endpoint: string, live = false): Promise<HttpResult> => {
      const requestStartedAt = new Date(this.io.now()).toISOString();
      let result: HttpResult;
      try {
        result = await this.io.get(
          live ? 2999 : credentials!.port,
          endpoint,
          live ? undefined : credentials!.password,
        );
      } catch {
        result = { status: 0 };
      }
      if (this.evidence) {
        observations.push({
          endpoint,
          startedAt: requestStartedAt,
          finishedAt: new Date(this.io.now()).toISOString(),
          status: result.status,
          data:
            result.status === 200
              ? this.sanitizer.endpoint(
                  endpoint,
                  result.body,
                  credentials?.password,
                )
              : null,
        });
      }
      return result;
    };

    let accountState: AccountState = "unavailable";
    let accountId: string | null = null;
    let accountName: string | null = null;
    if (credentials) {
      const [phase, account] = await Promise.all([
        get(endpoints.phase),
        get(endpoints.account),
      ]);
      // An authenticated HTTP response proves client reachability even when
      // there is no game or the lifecycle endpoint itself is unavailable.
      const reachable = [phase, account].some(
        (result) =>
          result.status >= 200 &&
          result.status < 500 &&
          result.status !== 401 &&
          result.status !== 403,
      );
      clientState = reachable ? "available" : "inaccessible";
      if (reachable) {
        const body = record(account.body);
        if (account.status === 200) {
          const puuid = nonempty(body.puuid);
          accountId =
            puuid && !/^0+$/.test(puuid.replaceAll("-", "")) ? puuid : null;
          accountState = accountId ? "identified" : "unidentified";
          if (accountId) {
            const name = nonempty(body.gameName);
            const tag = nonempty(body.tagLine);
            accountName = name && tag ? `${name}#${tag}` : null;
          }
        } else if (account.status === 404) {
          accountState = "unidentified";
        }
      }
      if (this.evidence) {
        await Promise.all([
          get(endpoints.version),
          get(endpoints.ranked),
          get(endpoints.session),
        ]);
      }
    }
    // The game may outlive or run without the client. Its absence never
    // changes Client Availability. Only the opt-in capture needs these data.
    if (this.evidence && this.io.platform === "win32")
      await get(endpoints.live, true);

    const observedAt = new Date(this.io.now()).toISOString();
    return {
      state: {
        clientState,
        clientAvailable: clientState === "available",
        accountState,
        accountId,
        accountName,
        observedAt,
      },
      ...(this.evidence
        ? {
            evidence: {
              startedAt,
              observedAt,
              clientState,
              accountState,
              requests: observations,
            },
          }
        : {}),
    };
  }
}

function credentialsFrom(value: unknown): Credentials | undefined {
  const line = record(value).CommandLine;
  if (typeof line !== "string") return;
  const flag = (name: string): string | undefined => {
    const matches = [
      ...line.matchAll(
        new RegExp(
          `(?:^|\\s)"?--${name}=(?:"([^"]+)"|([^"\\s]+))"?(?=\\s|$)`,
          "g",
        ),
      ),
    ];
    return matches.length === 1 ? (matches[0][1] ?? matches[0][2]) : undefined;
  };
  const portString = flag("app-port");
  const password = flag("remoting-auth-token");
  if (!portString || !/^\d+$/.test(portString) || !password) return;
  const port = Number(portString);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return;
  return { port, password };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function nonempty(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

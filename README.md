# League of Legends for Fluxta

A Fluxta Plugin Source Package for observing the local League client and its
active account without a Riot API key. This first slice implements
[issue #1](https://github.com/inferst/fluxta-league-of-legends/issues/1), within
[fluxta/hub#21](https://github.com/fluxta/hub/issues/21).

Windows is the only supported runtime platform. **Actual Windows/client
evidence is recorded** for [Solo/Duo](docs/acquisition/observations/2026-11-03-windows-session-02.md),
[Flex](docs/acquisition/observations/2026-11-03-windows-session-03.md),
and [normal draft](docs/acquisition/observations/2026-11-03-windows-session-04.md) games.
Required match-queue families are covered. League/Fluxta restart recovery and
sign-out/login states and account switching have [operator confirmation](docs/acquisition/observations/2026-11-03-manual-account-recovery.md).
Actual-host account identity absence and recovery are also operator-confirmed.
The [agreed verification pass](docs/acquisition/observations/2026-11-04-verification-summary.md)
is recorded with explicit exceptions and measurement limits. Controlled whole-API failure is deferred by agreement;
unranked verification is explicitly not run because no suitable account is
available. These are recorded limitations of the current verification pass.
Automated tests use explicitly synthetic inputs.

## Development

Requires Node >=22.18.0 and pnpm 10.34.3. No Hub checkout is needed.

```sh
pnpm install --frozen-lockfile
pnpm check
```

Individual commands: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`,
`pnpm test`, `pnpm build`, `pnpm validate`. `pnpm format` formats the source.
`pnpm dev` rebuilds on changes; run `pnpm exec fluxta restart` after a rebuild
to restart a linked plugin. `pnpm check` runs all checks and validates both the
Plugin Source Package and `dist/league-of-legends/` with the published CLI.

The published SDK/CLI are pinned through `catalog:` in `pnpm-workspace.yaml`.
The build bundles runtime packages; `dist/league-of-legends/` needs no `node_modules` or
checkout. See [agent instructions](AGENTS.md), [glossary](CONTEXT.md) and
[issue workflow](docs/agents/issue-tracker.md).

## Load into Fluxta on Windows

Start Fluxta >=0.9.0 on the same computer as League, then from this checkout:

```powershell
pnpm build
pnpm exec fluxta link dist/league-of-legends
pnpm exec fluxta link --status
```

If a Development Link was previously registered as `lol`, run
`pnpm exec fluxta unlink lol` before linking the new build. Reselect Sources in
existing test scenarios under `league-of-legends`; their fully qualified names
use the new package id. Historical verification reports retain the earlier id
used during those sessions.

Fluxta's standard plugin connection indicator reports one External Connection,
**League of Legends**, with the stable id `local-client`. It is connected when
the client responds to authenticated local API requests, even if no match is
running or no account can be identified. The SDK replays this snapshot after
its own connection to Fluxta is restored. There is no Item or custom editor
required for the indicator.

The plugin queries `LeagueClientUx.exe` through Windows PowerShell/CIM and reads
its current local port and authentication token. It rediscovers them on every
poll, handles restarts/token rotation, and refuses ambiguous multiple clients.
Requests use HTTPS to `127.0.0.1` only, with a request-specific self-signed TLS
exception and a 1.5-second deadline. Discovery has a five-second deadline.
Observation cycles are serial, with a one-second delay after each cycle.
Discovery/authentication failures report `inaccessible` and retry automatically.
Do not run extra diagnostic commands that print process command lines.

## Public Value Sources

All are Query Sources. They read the latest completed in-memory observation;
resolving a Source does no process or network I/O. Use them in a scenario's If
Else condition or as a Value Source for Set Variable.

| Source                              | Type    | Meaning                                                                        |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `league-of-legends.clientState`     | string  | `checking`, `absent`, `available`, `inaccessible`, `unsupported`               |
| `league-of-legends.clientAvailable` | boolean | Whether the League client is reachable now                                     |
| `league-of-legends.accountState`    | string  | `identified`, `unidentified`, `unavailable`                                    |
| `league-of-legends.accountId`       | string  | Current account PUUID; absent without a usable identity                        |
| `league-of-legends.accountName`     | string  | Current Riot ID (`gameName#tagLine`); absent if either part is missing         |
| `league-of-legends.observedAt`      | string  | Last completed client observation, UTC ISO 8601; absent before the first cycle |

`absent` means no League client process was found. `inaccessible` means discovery
failed, credentials could not be read, several clients were found, or local
requests did not establish reachability. `unsupported` means a Development Link
was started outside Windows.

`identified` requires a nonempty, nonzero PUUID. `unidentified` means the current
account endpoint returned 404 or a successful response without that identity
(including sign-out/startup); it does not certify a particular login screen.
`unavailable` means the account could not currently be read. A reachable client
with an account endpoint failure stays available. A previous account is never
substituted. No rank, credential, account or match state is persisted in this
slice, and there are no Plugin Settings to configure.

An absent account Source does not necessarily clear a Global Variable previously
assigned through Set Variable. Reset both destination variables to a literal
placeholder such as `NO_ACCOUNT` before resolving the Sources; use current
Sources/account state for active-account conditions. The runbook includes a
`SOURCE_ABSENT` marker check to distinguish skipped assignment from an actual
stale identity returned by the host query.

## Windows acquisition evidence

For a guided collection session on the Windows machine with League and Fluxta,
start Fluxta, leave League closed, then run:

```powershell
pnpm verify:windows --out captures/windows-session-01 --seconds 3600
```

This builds the runner, runs `pnpm check`, links/restarts the plugin through the
published CLI, records the existing sanitized capture, and writes `session.json`
and `report.md` into a new directory. The session records the tested commit,
whether the checkout was dirty, environment versions and completed preparation
stages. Follow the runbook while recording: sign in/out, change accounts,
restart clients and play the required queues yourself. Ctrl+C ends recording
and lets the runner summarize completed capture lines. Use a fresh output
directory for each attempt; existing directories are never overwritten.

Completed sessions also produce compact analysis artifacts automatically. For
an existing **finished** capture, run the offline extractor (no League/Fluxta
launch or connection):

```powershell
pnpm capture:compact --input captures/windows-session-01/capture.jsonl --out captures/windows-session-01-compact
```

Start with `summary.md`. It includes observation counts, the retained-frame
ratio, source SHA-256 and extraction limitations. `evidence.jsonl` contains
selected full original JSONL lines: first/last observations, client/account and
HTTP changes, account/ranked/version/lifecycle/session changes, roster changes,
new response shapes and the first example of each event type per observation
segment. By default the extractor also retains one neighboring frame before
and after changes; `--context 0..5` adjusts that count. Clock, score, level and
death ticks alone do not retain a frame.

`evidence-index.jsonl` maps each retained line to its 1-based original
`sourceLine` and selection reasons. `events.jsonl` contains deduplicated native
events with original request times/source lines; same-id corrections remain as
revisions. Event ids are scoped to conservative observation segments using
observed game-id/clock/event-count resets and ambiguous Live recoveries. These
segments do not prove that separate API responses belong to one match. The
extractor flags potential gaps in the collector's last-50-event window and
retains synthetic provenance. The original inventory remains in `report.md`.

The extractor streams the source, keeps a small neighbor buffer and event/shape
fingerprints, and never rewrites the original capture or overwrites output
files. Use a new output directory for every run. Finish recording before
extracting: truncated, foreign or changing input fails without a completed
`summary.md`. This is selection from the existing allowlisted collector output,
not a sanitizer for raw API dumps; review retained evidence before sharing.
Read additional original lines when needed, using the index. Roster readiness,
rank interpretation and public Fluxta checks still require runbook assessment.

`--capture-only` explicitly skips the Fluxta link/start steps. To summarize an
existing capture without launching anything or claiming it tested the current
commit, run:

```powershell
pnpm verify:windows --input captures/windows-session-01/capture.jsonl --out captures/windows-summary-01
```

The report inventories observed states, transitions, HTTP statuses, candidate
lifecycle labels and queue ids. It does not certify ranks, roster readiness or
public Sources/External Connections in Fluxta. Installed CLI 0.8.2 supports
link/lifecycle commands but has no public command to inspect those host values;
complete the manual runbook checks and results template separately. Keep
synthetic and actual-client evidence distinct. Local `probe-results/` diagnostics
are ignored like captures; unrelated diagnostic JSON is not a capture input.

After building, run the optional collector from PowerShell:

```powershell
pnpm capture --out captures/session-01.jsonl --seconds 1200
```

The collector uses the same discovery, HTTP transport and account decisions as
the plugin, adding local ranked, lifecycle and Live Client probes. It creates a
new JSONL file, refuses overwrites and flushes on Ctrl+C. It runs independently
of Fluxta, so check public Sources in the host separately using the runbook.

Captures contain allowlisted fields, per-request times/statuses and stable
pseudonyms within each file. There are no raw process lines, port/token dumps,
HTTP errors or unrestricted response copies. Missing fields stay missing and
zero/false values stay intact. `_observedKeys` records field names whose values
may have been omitted; it is capture metadata, not an API field. Live game
events retain the last 50 entries per observation, with `_totalEvents` recording
the full count. Capture files are ignored by git until reviewed and promoted to
`docs/acquisition/observations/`.

The [acquisition findings](docs/acquisition/findings.md) distinguish documented
inputs, implementation candidates and real-client evidence. Ranks, full match
statistics, Events, Roster Ready and Get Match State belong to later tickets;
this slice neither invents them nor guarantees loading-screen completeness.

League of Legends for Fluxta is not endorsed by Riot Games and does not reflect
the views or opinions of Riot Games or anyone officially involved in producing
or managing Riot Games properties. Riot Games, League of Legends and all
associated properties are trademarks or registered trademarks of Riot Games, Inc.

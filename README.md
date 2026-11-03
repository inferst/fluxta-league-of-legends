# League of Legends for Fluxta

A Fluxta Plugin Source Package for observing the local League client and its
active account without a Riot API key. This first slice implements
[issue #1](https://github.com/inferst/fluxta-league-of-legends/issues/1), within
[fluxta/hub#21](https://github.com/fluxta/hub/issues/21).

Windows is the only supported runtime platform. **Actual Windows/client
verification is pending.** Follow the [Windows runbook](docs/acquisition/windows-runbook.md)
to establish it. Automated tests use explicitly synthetic inputs.

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
Plugin Source Package and `dist/lol/` with the published CLI.

The published SDK/CLI are pinned through `catalog:` in `pnpm-workspace.yaml`.
The build bundles runtime packages; `dist/lol/` needs no `node_modules` or
checkout. See [agent instructions](AGENTS.md), [glossary](CONTEXT.md) and
[issue workflow](docs/agents/issue-tracker.md).

## Load into Fluxta on Windows

Start Fluxta >=0.9.0 on the same computer as League, then from this checkout:

```powershell
pnpm build
pnpm exec fluxta link dist/lol
pnpm exec fluxta link --status
```

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

| Source                | Type    | Meaning                                                                        |
| --------------------- | ------- | ------------------------------------------------------------------------------ |
| `lol.clientState`     | string  | `checking`, `absent`, `available`, `inaccessible`, `unsupported`               |
| `lol.clientAvailable` | boolean | Whether the League client is reachable now                                     |
| `lol.accountState`    | string  | `identified`, `unidentified`, `unavailable`                                    |
| `lol.accountId`       | string  | Current account PUUID; absent without a usable identity                        |
| `lol.accountName`     | string  | Current Riot ID (`gameName#tagLine`); absent if either part is missing         |
| `lol.observedAt`      | string  | Last completed client observation, UTC ISO 8601; absent before the first cycle |

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

## Windows acquisition evidence

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

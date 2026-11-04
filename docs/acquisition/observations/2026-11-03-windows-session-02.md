# Windows acquisition result: windows-session-02

Status: **Partial real-client verification recorded**. One actual Solo/Duo
Summoner's Rift game was observed on Windows through the plugin's acquisition
capability. The operator reported playing the match, partially checking Fluxta,
and accepting the recorded data as correct. This establishes the contracts below
for this run; remaining scenarios and queues stay open in issue #1.

## Environment and provenance

- Capture UTC: 2026-11-03T13:38:09.281Z–2026-11-03T14:19:26.388Z.
- Recorded commit: `365edb10e14e166f495a69146e9703afdbdc61ce`; **dirty checkout**.
  This is the baseline commit with local automation changes, not a clean-commit
  verification claim.
- Windows release: `10.0.26300`; edition and elevation were not recorded.
- Node: `v22.23.4`; configured package manager: `pnpm@10.34.3`.
- Local `/lol-patch/v1/game-version` response, starting at source line 27:
  `16.21.8342754+branch.releases-16-21.code.public.content.release.anticheat.vanguard`.
  Visible League/patch and Fluxta version numbers were not manually recorded.
- Session preparation: `pnpm check` passed; published CLI reported the plugin
  running after link/restart; capture completed without a failed stage.
- Operator confirmation: partial Sources/connection checking, with acceptance
  of the recorded run as correct. Exact per-Source UI readings, screen timestamps
  and latencies were not recorded; the confirmation supplies no invented values.
- Extractor summary: 1,578 completed frames, 32,913,908 source bytes; 119 frames
  retained in 2,022,855 bytes; 95 deduplicated event records.
- Reported original SHA-256:
  `c244b84dd648f8cf5e7bd39c74e8dc242f1a8684e2664ebde72f2be7a4365b60`.
  The full `capture.jsonl` was absent from the available session folder at review,
  so its hash and omitted polls could not be independently rechecked. Analysis
  uses the retained evidence/index, event records, session metadata and summary.

The [representative capture](2026-11-03-windows-session-02/evidence.jsonl)
preserves original full JSONL line contents and provenance. Its
[index](2026-11-03-windows-session-02/evidence-index.jsonl) maps sample lines to
the **original full-capture** line numbers used throughout this report. The
[events](2026-11-03-windows-session-02/events.jsonl),
[session metadata](2026-11-03-windows-session-02/session.json) and
[provenance manifest](2026-11-03-windows-session-02/provenance.json) are retained
alongside it. Account/player/game identifiers are within-file aliases.

## Public capability and acquisition

| Check                                | Observed result and limits                                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plugin loads in Fluxta               | CLI link/restart reported `plugin-running`; operator partially checked the host and accepted run accuracy. Full per-Source/indicator assertions were not recorded.                                   |
| Client absent                        | Source line 2: collector `absent / unavailable`. After closing the client, line 1571 returns to `absent / unavailable`, with no account request/identity in that frame.                              |
| Startup and recovery                 | Line 20: `inaccessible / unavailable`; line 26: `available / identified`. This is startup recovery, not the controlled temporary-inaccessibility test.                                               |
| Client reachable without a game      | Lines 26–27: phase `None`, account HTTP 200, session HTTP 404, Live status 0; collector remains `available / identified`.                                                                            |
| Current account                      | A nonempty PUUID and complete Riot ID are present; one account alias occurs in retained account responses. Operator accepts the data as correct.                                                     |
| Account association                  | Account PUUID uniquely matches one LCU participant on `teamOne`; the same observation's account Riot ID equals Live `activePlayer.riotId`, which uniquely matches one `allPlayers` entry on `ORDER`. |
| Sign-out / account change            | Not separately exercised. Client closure does not establish a reachable signed-out account or account switch.                                                                                        |
| Client restart / credential rotation | Not established by this single start/play/close sequence.                                                                                                                                            |
| Temporary local API failure          | Startup inaccessibility is observed; deliberate in-menu suspension/recovery was not established.                                                                                                     |
| Fluxta restart / connection replay   | Not separately recorded.                                                                                                                                                                             |

Reachability is demonstrated through authenticated local requests made by the
real acquisition capability. Non-elevated discovery and process privilege
relationships were not recorded. No process flags, ports, credentials or raw
errors are included in the evidence.

## Ranked and queue contracts

`/lol-ranked/v1/current-ranked-stats` returned HTTP 200 with **both** a `queues`
array (six entries in the retained response) and `queueMap`. The two relevant
map entries agree with their corresponding array entries.

| Queue             | Before match, source line 26                | After match, source line 1549             |
| ----------------- | ------------------------------------------- | ----------------------------------------- |
| `RANKED_SOLO_5x5` | `GOLD`, `II`, 31 LP; wins 262, losses 238   | `GOLD`, `II`, 51 LP; wins 263, losses 238 |
| `RANKED_FLEX_SR`  | `SILVER`, `IV`, 42 LP; wins 284, losses 280 | Unchanged                                 |

The Solo update was observed at request
`2026-11-03T14:18:41.645Z`–`14:18:41.664Z`, alongside `PreEndOfGame`.
For these two queues `isProvisional` is `false` and
`provisionalGamesRemaining` is `0`. This confirms independent inputs and an
observed rank update; it introduces no runtime rank persistence. A Flex match
and a visibly confirmed unranked queue/account were not tested.

The gameflow session records queue `id: 420`, `type: RANKED_SOLO_5x5`,
`gameMode: CLASSIC`, `mapId: 11` inside **`gameData.queue`**. Live data independently
records `gameMode: CLASSIC`, `mapName: Map11`, `mapNumber: 11`. The retained
`gameData` has no direct `mapId` or `gameMode` field; root session `map` exists
in `_observedKeys` but its values were not collected. Do not infer its schema.

The pre-game `gameData.gameId` is 0. At line 375 it becomes the nonzero alias 1
and remains that alias through `EndOfGame` in retained responses. This is
within-capture identity evidence, not the original numeric game id.

## Lifecycle

| Original source line | Phase request completed UTC | Observed value |
| -------------------- | --------------------------- | -------------- |
| 26                   | 13:38:44.223                | `None`         |
| 149                  | 13:41:56.104                | `Lobby`        |
| 163                  | 13:42:18.721                | `Matchmaking`  |
| 171                  | 13:42:31.301                | `ReadyCheck`   |
| 179                  | 13:42:44.004                | `Matchmaking`  |
| 180                  | 13:42:45.580                | `ReadyCheck`   |
| 184                  | 13:42:51.891                | `ChampSelect`  |
| 256                  | 13:44:45.293                | `Matchmaking`  |
| 257                  | 13:44:46.928                | `ReadyCheck`   |
| 265                  | 13:44:59.512                | `Matchmaking`  |
| 270                  | 13:45:07.395                | `ReadyCheck`   |
| 272                  | 13:45:10.543                | `ChampSelect`  |
| 375                  | 13:47:51.267                | `InProgress`   |
| 1549                 | 14:18:41.641                | `PreEndOfGame` |
| 1557                 | 14:18:53.957                | `EndOfGame`    |
| 1565                 | 14:19:06.155                | `None`         |

All times are on 2026-11-03. The return from the first `ChampSelect` to
`Matchmaking` is observed; its cause was not recorded. No `GameStart` **phase**
was retained/reported. Do not require that phase or treat `InProgress` alone
as proof that the player has already entered the map.

## First retained complete compositions and identity

| Measurement                               | Actual observation                                                                                                                                                     |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Last incomplete LCU composition           | Source line 374, session request `13:47:49.647Z`–`13:47:49.663Z`: `ChampSelect`, both team arrays empty.                                                               |
| First retained complete LCU composition   | Line 375, session request `13:47:51.269Z`–`13:47:51.289Z`: `InProgress`, two teams of five, ten nonzero `championId` values and ten unique nonempty PUUID aliases.     |
| Account used for that LCU join            | Same frame, current-account request `13:47:51.256Z`–`13:47:51.266Z`; PUUID matches exactly one `teamOne` participant, `championId: 526`, `selectedPosition: UTILITY`.  |
| Live still unavailable                    | Line 375 status 0; lines 376–379 include HTTP 404. Last retained failed request: line 379, `13:47:58.026Z`–`13:47:58.031Z`.                                            |
| First retained complete Live composition  | Line 380, request `13:47:59.624Z`–`13:47:59.790Z`: ten players, `ORDER: 5`, `CHAOS: 5`, champions and positions present; `gameTime: 0.03287399932742119`.              |
| Account used for that Live join           | Same frame, current-account request `13:47:59.588Z`–`13:47:59.602Z`: full Riot ID equals `activePlayer.riotId` and exactly one roster entry, Rell, `ORDER`, `UTILITY`. |
| First native `GameStart` observation      | Line 386, Live request `13:48:09.043Z`–`13:48:09.052Z`; `gameTime: 1.2764239311218262`, event time `0.03287399932742119`.                                              |
| Last retained successful Live observation | Line 1547, request `14:18:37.550Z`–`14:18:37.565Z`, `gameTime: 1829.7239990234375`, 95 total events.                                                                   |
| Manual loading/map timestamps             | Not recorded. The operator accepts the run as correct but supplied no exact screen times.                                                                              |

The first complete LCU response **completed 8.501 seconds earlier** than the
first successful Live response. These are different requests, each preceded
by the account response listed above; they are not an atomic snapshot or exact
server readiness timestamps. Earliest values here mean earliest **retained**
evidence, with neighboring source lines and extractor selection history; omitted
full-source polls were unavailable for review.

The Live clock remains `0.03287399932742119` in retained lines 380, 381 and 385,
through `13:48:07.464Z`; it advances by line 386. Thus a successful Live response,
`InProgress` or a nonzero clock alone does not establish the visible end of
loading. The data demonstrate early complete compositions and a usable account
join, while precise loading-screen versus in-map readiness remains unmeasured.
Keep the previously accepted in-map fallback for cases without complete early
data; do not describe that fallback as a measured guarantee for every client.

The LCU `teamOne` champion ids are `[59, 526, 134, 14, 15]` and `teamTwo` ids
are `[35, 54, 103, 497, 21]`. Live `ORDER` contains Jarvan IV, Rell, Syndra, Sion
and Sivir; `CHAOS` contains Shaco, Malphite, Ahri, Rakan and Miss Fortune. Exact
full Riot ID and PUUID joins identify the local player/team; ordering of the
returned arrays is not used as identity evidence. The sorted Live roster is
unchanged across all 63 retained successful Live frames. All 74 retained
complete LCU frames have the unique current-account PUUID join.

Live player entries have no PUUID or summoner id in the observed response keys.
Use the current-account Riot ID bridge for the local player; do not invent a
PUUID for every Live participant. LCU includes `selectedPosition`, Live includes
`position`; actual labels include `TOP`, `JUNGLE`, `MIDDLE`, `BOTTOM`, `UTILITY`.
Other fields named only in `_observedKeys` were not necessarily retained.

## Native happenings

The deduplicated event file contains **95 unique EventIDs, 0–94**, in one
observation segment, with no event revisions. The extractor reported no event
window gaps. IDs are contiguous in the retained event file; this does not
establish that an unobserved final event could not have appeared later.

| EventName         | Count | Example source line | Additional retained fields                                                                          |
| ----------------- | ----- | ------------------- | --------------------------------------------------------------------------------------------------- |
| `GameStart`       | 1     | 386                 | None                                                                                                |
| `MinionsSpawning` | 1     | 404                 | None                                                                                                |
| `ChampionKill`    | 58    | 469                 | `KillerName`, `VictimName`, `Assisters`                                                             |
| `FirstBlood`      | 1     | 469                 | `Recipient`                                                                                         |
| `DragonKill`      | 4     | 674                 | `DragonType`, `Stolen`, `KillerName`, `Assisters`                                                   |
| `Multikill`       | 8     | 744                 | `KillStreak`, `KillerName`                                                                          |
| `HordeKill`       | 3     | 781                 | `Stolen`, `KillerName`, `Assisters`                                                                 |
| `TurretKilled`    | 12    | 912                 | `TurretKilled`, `KillerName`, `Assisters`                                                           |
| `FirstBrick`      | 1     | 912                 | `KillerName`                                                                                        |
| `HeraldKill`      | 1     | 1014                | `Stolen`, `KillerName`, `Assisters`                                                                 |
| `BaronKill`       | 1     | 1313                | `Stolen`, `KillerName`, `Assisters`                                                                 |
| `InhibKilled`     | 3     | 1475                | `InhibKilled`, `KillerName`, `Assisters`                                                            |
| `Ace`             | 1     | 1491                | `Acer` and `AcingTeam` are named in `_observedKeys` but their values were omitted by the collector. |

All have `EventID`, `EventName`, `EventTime`. In this run, `Stolen` is a
**string**, including `"True"` and `"False"`, not a boolean. An empty `Assisters`
array is observed and is distinct from a missing field. Name references are
pseudonyms, sometimes bare player-name aliases rather than complete Riot IDs;
do not assume every event name directly supplies a participant PUUID.

No native `GameEnd` event or final `Result` was recorded. Live fails at line
1548 while phase remains `InProgress`; separate later LCU responses establish
`PreEndOfGame` and `EndOfGame`. Transport failure by itself is not a game-end
signal. These are acquisition observations for later tickets, not implemented
plugin Events.

## Remaining work

- Keep issue #1 open: normal and Flex match runs, visibly confirmed unranked
  representation, controlled local failure/recovery, reachable signed-out and
  account-change behavior, restarts/credential rotation and connection replay
  remain unverified by this run.
- Exact loading/map screen times, visible client/Fluxta versions and privilege
  context were not recorded. Preserve the available build string and current
  user confirmation without substituting invented values.
- Capture root session `map` values or omitted event fields only in a later
  allowlist change if needed. Metadata field names alone are not their values.
- Public Sources/indicator have partial operator confirmation. Collector state
  and CLI plugin-running status do not supply missing host assertions/latencies.
- Complete original capture unavailable at review. Keep the retained sample,
  original-line mapping, event stream and provenance with this partial result.
- This review records local results and updates findings; no remote issue
  comment or acceptance checkbox was changed by this review.

# Acquisition findings

Status: **Windows execution pending**. No real client version has been tested
in this checkout. Automated fixtures are synthetic; they establish behavior
against candidate inputs, not endpoint availability or loading-screen timing.
Do not close issue #1 until the [runbook](windows-runbook.md) results and reviewed
representative observations have been recorded here and on the issue.

## Sources and current candidates

Riot describes the [League Client API](https://developer.riotgames.com/docs/lol#league-client-api)
as a local interface without third-party support guarantees. Its endpoint paths
and response shapes below remain candidates until Windows observation. Riot
documents the [Live Client Data API](https://developer.riotgames.com/docs/lol#game-client-api_live-client-data-api)
for active games over local HTTPS, including the game, player and native event
data. Documentation does not establish when a real loading-screen roster is
complete. Microsoft documents [local CIM discovery](https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/get-ciminstance?view=powershell-5.1)
and [process command-line data](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process).
The League process flags themselves still require real-client verification.

| Acquisition input                                   | Fields/contract to verify                                                                                                                           | Evidence                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `LeagueClientUx.exe` process                        | `--app-port`, `--remoting-auth-token`; same-user non-elevated discovery, restart/token rotation                                                     | Pending                                   |
| `/lol-summoner/v1/current-summoner`                 | `puuid`, `gameName`, `tagLine`, `summonerId`; startup/sign-out responses                                                                            | Candidate, pending                        |
| `/lol-gameflow/v1/gameflow-phase`                   | String lifecycle values and transition timing; reachability without a game                                                                          | Candidate, pending                        |
| `/lol-patch/v1/game-version`                        | Client/game version string; otherwise manually record visible versions                                                                              | Candidate, pending                        |
| `/lol-ranked/v1/current-ranked-stats`               | `queues` or `queueMap`; independent `RANKED_SOLO_5x5` and `RANKED_FLEX_SR`, `tier`, `division`, `leaguePoints`; explicit unranked/missing responses | Candidate, pending                        |
| `/lol-gameflow/v1/session`                          | `phase`, `gameData.gameId`, `mapId`, `queue.id/type/gameMode/mapId`; `teamOne`, `teamTwo`, final `championId`, stable identities                    | Candidate, pending                        |
| `https://127.0.0.1:2999/liveclientdata/allgamedata` | `activePlayer`, `allPlayers`, `gameData`, `events.Events`; identity joins, `team`, champion, role, game time                                        | Documented source; Windows timing pending |

All reads are GETs. The plugin polls only account and phase; the opt-in collector
adds the other probes through exactly the same local I/O. Live Client failure
does not affect Client Availability. HTTP status `0` in a capture means timeout,
transport failure or an oversized response; unsuccessful HTTP response bodies
are never retained. A 200 with `data: null` means no usable projected shape was
available. `_observedKeys` exposes field names without unknown field values.

## Queue and lifecycle decisions

Later match behavior must use observed queue metadata. Queue ids 400/430
(draft/blind), 480 (Swiftplay), 490 (Quickplay), 420 (Solo/Duo) and 440 (Flex)
are candidates to check against Riot's
[game constants](https://static.developer.riotgames.com/docs/lol/queues.json) and
the local session. They are **not an implemented supported-match classifier**
in this slice. Record map 11 / Summoner's Rift, mode and queue type together;
never identify a supported match from `CLASSIC` alone. Test at least normal,
Solo/Duo and Flex; custom/practice data cannot stand in for those checks.

The collector retains whatever lifecycle strings were observed; no Event or
match-start/completion interpretation is implemented here. An HTTP interruption
does not establish a match end. A missing role, rank, participant identifier,
Riot ID or champion remains unknown; neither team order nor display-label
similarity proves participant identity.

## Final-roster readiness and accepted fallback

Loading-screen readiness is **unverified**. Champion-select hovers, ally-only
data, missing opponents or a partial roster do not establish Roster Ready.
Inspect both LCU teams and Live Client Data during loading and after entering
the map. For a standard supported 5v5, require all ten final champions, both team
memberships, and an unambiguous join to the active account. Record actual team
sizes and any missing fields rather than padding a roster.

The accepted fallback is the **first complete observation after entering the
map**, carrying its actual stage and game time in later features. This is the
agreed fallback, not a measured first-readiness time. When loading data are
unavailable, document that explicitly. If in-map data are still incomplete,
record that limitation and keep readiness unavailable. No guessed composition,
user Riot API key or hosted backend is introduced.

## Native happenings

Live Client Data documents `events.Events`, with native `EventID`, `EventName`
and `EventTime` and event-specific fields. The collector records observed event
names and field names, and selected details such as `KillerName`, `VictimName`,
`Assisters`, `TurretKilled`, `InhibKilled`, `DragonType`, `Stolen` and `Result`.
Do not claim all such events exist on a client from the allowlist alone. The
runbook must list what actually appeared (for example game start/end, champion
kill, turret/inhibitor destruction, dragon/herald/baron kills) and what remains
untested. A native event stream is distinct from future statistic-diff Events.

## Evidence ledger

| Environment/check                                                        | Result   |
| ------------------------------------------------------------------------ | -------- |
| Real Windows version / League client build / game patch / Fluxta version | Not run  |
| Non-elevated discovery, active account, restart, sign-out                | Not run  |
| Independent Solo/Duo and Flex ranked inputs, unranked representation     | Not run  |
| Normal / Solo/Duo / Flex queue and lifecycle metadata                    | Not run  |
| Earliest complete loading roster                                         | Unknown  |
| Earliest complete in-map roster and game time                            | Unknown  |
| Native happening names and available fields                              | Not run  |
| Representative sanitized Windows observations                            | None yet |

Store reviewed real captures in `observations/` with a report based on
[the result template](windows-results-template.md). Preserve provenance and
sequence timing. The synthetic fixture in `tests/fixtures/` is intentionally a
partial roster and must never be relabeled as a real capture.

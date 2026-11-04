# Acquisition findings

Status: **Partial Windows/client evidence recorded**. Real Solo/Duo, Flex and normal draft
Summoner's Rift games on Windows release `10.0.26300` were reviewed in
[windows-session-02](observations/2026-11-03-windows-session-02.md),
[windows-session-03](observations/2026-11-03-windows-session-03.md) and
[windows-session-04](observations/2026-11-03-windows-session-04.md), with the local
version endpoint reporting
`16.21.8342754+branch.releases-16-21.code.public.content.release.anticheat.vanguard`.
The report and reviewed, pseudonymized samples establish account/queue/ranked,
lifecycle, complete-roster and native-event inputs for all three required queue
families on this build. Public host checks have partial operator confirmation.
Sessions 03/04 have full-source hash, extractor-retained line and derived event
verification against their original captures. Session-02's full original was absent at review;
its retained evidence, mappings and reported hash are preserved. Exact loading/map
screen times and visible Fluxta/client versions were not recorded.
An additional [operator report](observations/2026-11-03-manual-account-recovery.md)
confirms sign-out state transitions, login recovery, account-value replacement
when switching, and automatic League/Fluxta restart recovery. The subsequent
operator-confirmed marker check passes: `SOURCE_ABSENT` stays while the client
is absent, and account values replace it after reopening. Earlier retained
Global Variables reflect skipped absent assignments, not an old identity
returned by the tested Source queries. Controlled whole-API outage is explicitly deferred by
agreement, and the unranked check is explicitly **NOT RUN** because the operator
has no suitable account. Both are accepted scope exceptions for this verification
pass, with their unverified behavior retained as limitations; see the
[skipped-check record](observations/2026-11-03-manual-account-recovery.md#explicitly-skipped-checks-for-this-verification-pass).
They are not counted as passed or queued for the operator. The agreed hands-on
verification pass is recorded in the [combined summary](observations/2026-11-04-verification-summary.md),
ready for issue/PR review with explicit limitations. Synthetic automated
fixtures remain separate evidence; this local review does not close issue #1.

[Session-05](observations/2026-11-03-windows-session-05.md) adds a fully reviewed
no-game Solo/Duo lobby recording with an actual account-request interruption
and recovery while the client stays reachable. Its full source hash and all
retained lines were verified; it adds no played game or native events.

## Sources and current candidates

Riot describes the [League Client API](https://developer.riotgames.com/docs/lol#league-client-api)
as a local interface without third-party support guarantees. Its endpoint paths
and response shapes below remain candidates until Windows observation. Riot
documents the [Live Client Data API](https://developer.riotgames.com/docs/lol#game-client-api_live-client-data-api)
for active games over local HTTPS, including the game, player and native event
data. Documentation does not establish when a real loading-screen roster is
complete. Microsoft documents [local CIM discovery](https://learn.microsoft.com/en-us/powershell/module/cimcmdlets/get-ciminstance?view=powershell-5.1)
and [process command-line data](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-process).
Actual authenticated discovery succeeded in the reviewed run. Non-elevated
operation, privilege relationships and rotated credentials were not recorded.

| Acquisition input                                   | Fields/contract to verify                                                                                                                           | Evidence                                                                                                                             |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `LeagueClientUx.exe` process                        | `--app-port`, `--remoting-auth-token`; same-user non-elevated discovery, restart/token rotation                                                     | Authenticated discovery and operator-reported restart recovery observed; elevation/rotation details unrecorded                       |
| `/lol-summoner/v1/current-summoner`                 | `puuid`, `gameName`, `tagLine`, `summonerId`; startup/sign-out responses                                                                            | Identity/joins and real account-endpoint recovery observed; operator confirms switch, sign-out, absent Source marker and recovery    |
| `/lol-gameflow/v1/gameflow-phase`                   | String lifecycle values and transition timing; reachability without a game                                                                          | Eight phase values, retries, reachable no-game state and one isolated phase failure with reachable account observed                  |
| `/lol-patch/v1/game-version`                        | Client/game version string; otherwise manually record visible versions                                                                              | Full build string observed; transient startup HTTP 204 also recorded                                                                 |
| `/lol-ranked/v1/current-ranked-stats`               | `queues` or `queueMap`; independent `RANKED_SOLO_5x5` and `RANKED_FLEX_SR`, `tier`, `division`, `leaguePoints`; explicit unranked/missing responses | Both shapes; independent ranked updates and no normal-run change; unranked NOT RUN (no suitable account), contract unknown           |
| `/lol-gameflow/v1/session`                          | `phase`, `gameData.gameId`, `gameData.queue.id/type/gameMode/mapId`; `teamOne`, `teamTwo`, final `championId`, stable identities                    | Queues 400/420/440, full 5+5 rosters and opposite-side PUUID joins; post-game Lobby can retain old game/rosters with a changed queue |
| `https://127.0.0.1:2999/liveclientdata/allgamedata` | `activePlayer`, `allPlayers`, `gameData`, `events.Events`; identity joins, `team`, champion, role, game time                                        | Full 5+5 early rosters, exact account Riot ID joins to ORDER and CHAOS, roles/events; screen timing unmeasured                       |

All reads are GETs. The plugin polls only account and phase; the opt-in collector
adds the other probes through exactly the same local I/O. Live Client failure
does not affect Client Availability. HTTP status `0` in a capture means timeout,
transport failure or an oversized response; unsuccessful HTTP response bodies
are never retained. A 200 with `data: null` means no usable projected shape was
available. `_observedKeys` exposes field names without unknown field values.

## Queue and lifecycle decisions

Session-05 records `None → Lobby`, queue 420 / Solo-Duo, with game-id 0,
empty teams and no matchmaking/game before collection ends. Client state stays
available for all 29 observations despite no Live game. An account request at
original source line 18 returns status 0 / null data while phase returns HTTP
200; account state becomes `unavailable`. The next poll at line 19 restores
`identified` with the same within-file PUUID and full Riot ID, 1.710 seconds
between completed observations. This complements session-04's isolated phase
failure: endpoint failure and client reachability are separate facts. It does
not exercise a controlled whole-API outage or a reachable `unidentified` account.
All successful account responses in this capture refer to one account; the
operator-confirmed account switch is a separate manual observation.

Both ranked inputs stay constant in this lobby-only capture: Solo Gold II / 51
LP and Flex Silver IV / 19 LP. These are the starting values, not a recorded
cross-session delta. No unranked input is present. The last observation remains
available/identified in Lobby; stopping collection is not a game/client-close
event.

Later match behavior must use observed queue metadata. Actual runs now establish
queue ids **400 (normal draft), 420 (Solo/Duo) and 440 (Flex)**, with map 11 and
`CLASSIC` metadata. Other normal candidates, 430 (blind), 480 (Swiftplay) and
490 (Quickplay), remain unverified here; compare Riot's
[game constants](https://static.developer.riotgames.com/docs/lol/queues.json) and
the local session. These observations are **not an implemented supported-match classifier**
in this slice. Record map 11 / Summoner's Rift, mode and queue type together;
never identify a supported match from `CLASSIC` alone. Test at least normal,
Solo/Duo and Flex; custom/practice data cannot stand in for those checks.

The collector retains whatever lifecycle strings were observed; no Event or
match-start/completion interpretation is implemented here. An HTTP interruption
does not establish a match end. A missing role, rank, participant identifier,
Riot ID or champion remains unknown; neither team order nor display-label
similarity proves participant identity.

In session-02, queue metadata is inside `gameData.queue`: `id: 420`,
`type: RANKED_SOLO_5x5`, `gameMode: CLASSIC`, `mapId: 11`. Direct
`gameData.mapId/gameMode` values were absent from retained input; root `map`
was named in metadata but not collected. `gameData.gameId` becomes nonzero
at `InProgress` and stays stable through `EndOfGame`. The observed phase set
is `None`, `Lobby`, `Matchmaking`, `ReadyCheck`, `ChampSelect`, `InProgress`,
`PreEndOfGame`, `EndOfGame`. A first champion selection returns to matchmaking
before a later attempt reaches the game; its cause is unknown. No `GameStart`
phase was reported. A native `GameStart` event is a different input.

Session-03 confirms Flex as `gameData.queue.id: 440`, `type: RANKED_FLEX_SR`,
`gameMode: CLASSIC`, `mapId: 11`, and the same field locations. It observes
`Lobby → Matchmaking → ReadyCheck → ChampSelect → InProgress → PreEndOfGame →
EndOfGame → Lobby`. Every account/client observation stays identified/available.
After returning to `Lobby`, LCU still returns the old nonzero game-id alias and
the completed game's full teams, including the final source line 1692.
Consequently, a nonzero game id, queue metadata or a complete roster alone
cannot establish an active game. Future match behavior must interpret lifecycle
and avoid reusing those post-game values as a new active match.

Independent ranked updates are now observed in both directions: Solo changes
31→51 LP while Flex stays at 42 in session-02; Flex changes 42→62 LP while Solo
stays at 51 in session-03. Both relevant `queues` and `queueMap` entries agree.

Session-04 confirms **400 / NORMAL (normal draft)** through the active game and
`EndOfGame`. At source line 1444, returning to `Lobby` changes the queue to
**440 / RANKED_FLEX_SR**, while the normal game's id and both full team arrays
remain unchanged. The summary's two queue ids do not establish two games.
Future match behavior must bind queue metadata to the active game's lifecycle,
not relabel a completed game from subsequent lobby state.

All 1,468 ranked responses in session-04 leave Solo at Gold II / 51 LP and Flex
at Silver IV / 41 LP, with identical relevant array/map entries. The 41 Flex LP
is already present at the first frame; it differs from session-03's ending 62 LP.
Intervening history and cross-file account continuity are not established, so
that difference is not attributed to the normal game. A non-ranked match does
not establish the representation of an unranked ranked queue/account.

Session-04 also records a phase-request status 0 at line 1435 while the account
request succeeds. The collector remains `available / identified`, and that
frame's later session response already reports `PreEndOfGame`. The next phase
request succeeds. This is evidence for separate endpoint failures and continued
account/client availability, not the controlled full local-API outage scenario.

## Final-roster readiness and accepted fallback

Precise loading-screen readiness remains **unmeasured**. Champion-select hovers, ally-only
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

Session-02 provides complete retained LCU teams and a unique current-account
PUUID join at `13:47:51.269Z`–`13:47:51.289Z` (original line 375), after empty
teams at the preceding retained `ChampSelect` response (line 374). Live first
succeeds at `13:47:59.624Z`–`13:47:59.790Z` (line 380), with ten champions,
`ORDER: 5`, `CHAOS: 5`, positions and a unique full Riot ID account/active-player
join. The LCU response completes **8.501 seconds earlier**. Live gameTime is
`0.03287399932742119`, remaining frozen in retained frames through `13:48:07.464Z`.
Without manual screen timestamps, neither that clock nor `InProgress` certifies
that loading has ended. These are earliest retained observations, not exact
server readiness measurements or a guarantee across clients/queues. Live player
keys contain no PUUID; a participant-wide PUUID mapping cannot be invented.

Session-03's **full source** confirms first complete LCU teams at
`15:22:04.872Z`–`15:22:04.891Z` (line 190) and first complete Live data at
`15:22:15.095Z`–`15:22:15.104Z` (line 196): LCU completes **10.213 seconds
earlier**. The Live clock remains `0.03285270184278488` through line 242 at
`15:23:25.742Z`, an observed **70.638-second** frozen interval after complete
Live data first becomes available. The first advancing clock/native GameStart
is observed at line 243. Exact screen timing remains unrecorded.

All 1,477 successful Live observations in session-03 have a complete 5+5 roster
and an unambiguous current-account Riot ID join to Lux on **CHAOS**; all 1,503
complete LCU observations join the account PUUID to **teamTwo**. Session-02
instead joins to teamOne/ORDER. Do not assume the local player is on the first
team or the first roster entry. Account aliases are scoped within each file;
matching alias strings between sessions do not establish cross-file identity.

Session-04's full source confirms first complete LCU teams at
`17:35:01.776Z`–`17:35:01.797Z` (line 150) and first complete Live response at
`17:35:10.746Z`–`17:35:10.757Z` (line 155), **8.960 seconds later**. All 1,320
complete LCU responses uniquely join the account on teamOne; all 1,279 successful
Live responses uniquely join it to Alistar / ORDER / UTILITY, with full stable
5+5 compositions. The initial Live gameTime `0.030470000579953194` remains frozen
through `17:36:48.285Z` (line 217), an observed **97.528-second** interval after
Live roster availability. Exact visible loading/map times remain unrecorded.

The required queue families now have composition/account evidence: Solo/Duo,
Flex and normal draft. Early LCU-to-Live response gaps are respectively 8.501,
10.213 and 8.960 seconds; these are observed polling results, not guarantees or
measurements of a visible loading-screen boundary.

## Native happenings

Live Client Data documents `events.Events`, with native `EventID`, `EventName`
and `EventTime` and event-specific fields. The collector records observed event
names and field names, and selected details such as `KillerName`, `VictimName`,
`Assisters`, `TurretKilled`, `InhibKilled`, `DragonType`, `Stolen` and `Result`.
Do not claim all such events exist on a client from the allowlist alone. The
runbook must list what actually appeared (for example game start/end, champion
kill, turret/inhibitor destruction, dragon/herald/baron kills) and what remains
untested. A native event stream is distinct from future statistic-diff Events.

Session-02 retains 95 unique EventIDs (0–94) across 13 names: `GameStart`,
`MinionsSpawning`, `ChampionKill`, `FirstBlood`, `DragonKill`, `Multikill`,
`HordeKill`, `TurretKilled`, `FirstBrick`, `HeraldKill`, `BaronKill`, `InhibKilled`,
`Ace`. `Stolen` is a string (`"True"`/`"False"`) in observed monster events.
`Ace` names `Acer` and `AcingTeam` in metadata, but their values were omitted by
the allowlist. No native `GameEnd` or `Result` was retained; LCU separately
records `PreEndOfGame`/`EndOfGame` after Live becomes unreachable. Contiguous
retained IDs and no reported window gaps do not prove final-event completeness.

Session-03 adds **131 unique EventIDs (0–130), 14 names**, with all derived event
payloads and request timestamps verified against the full original. New observed
names are `InhibRespawned` and **`GameEnd`**; no `HeraldKill` occurs in that run.
There are 15 distinct observed names across the two games. `InhibRespawned`'s
inhibitor field is named in metadata but its value is omitted by the allowlist,
as are Ace's `Acer/AcingTeam` values. `Stolen` remains a string.

The native `GameEnd`, `Result: Win` response completes at `16:01:54.381Z`
(line 1671), **1.793 seconds before** the first `PreEndOfGame` phase response.
It is observed while phase still says `InProgress`; Live remains reachable in
the following `PreEndOfGame` frame and disappears at line 1673. The native end
input is therefore demonstrated, while session-02 shows it is not guaranteed to
be retained on every run. Live disappearance and LCU/native end timing must not
be treated as identical boundaries.

Session-04 adds **70 unique EventIDs (0–69), 11 names**, verified against the
full original. No new name is added to the 15-name union; there are now 296
event records across the three games. Native `GameEnd` and `Result` are absent
throughout this full capture, despite later session/phase `PreEndOfGame` and
`EndOfGame` responses. Win/loss cannot be recovered from these normal-game data.
`Stolen` again includes both string values `"True"` and `"False"`; Ace's extra
field values remain omitted. Native end/result collection remains an observed
capability from Flex, not a guaranteed input on every game.

## Evidence ledger

| Environment/check                                                        | Result                                                                                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real Windows version / League client build / game patch / Fluxta version | Windows release and local build string recorded; visible versions unrecorded                                                                                    |
| Non-elevated discovery, active account, restart, sign-out                | Discovery/account captured; switch, sign-out/relogin, League/Fluxta recovery and absent Source marker operator-confirmed; elevation/rotation details unrecorded |
| Independent Solo/Duo and Flex ranked inputs, unranked representation     | Independent ranked updates confirmed; unranked explicitly NOT RUN because no suitable account is available                                                      |
| Normal / Solo/Duo / Flex queue and lifecycle metadata                    | All three required families observed: normal draft 400, Solo 420, Flex 440; lobby metadata may mix new queue and old game data                                  |
| Earliest complete loading roster                                         | LCU precedes Live by 8.501 / 10.213 / 8.960 s (Solo/Flex/normal); screen times unrecorded                                                                       |
| Earliest complete in-map roster and game time                            | All three Live rosters complete near clock 0.03; exact visible map-entry time unrecorded                                                                        |
| Native happening names and available fields                              | 95 + 131 + 70 events, 15 names in union; GameEnd/Win in Flex, absent in Solo/normal recordings                                                                  |
| Representative sanitized Windows observations                            | Reviewed subsets, source-line mappings and provenance for sessions 02?05; session-05 is lobby/account-only                                                      |

Operator-confirmed account/restart outcomes are detailed in the
[manual check report](observations/2026-11-03-manual-account-recovery.md).
The registered Sources clear identity to null in existing synthetic behavior
tests. The operator also confirms actual-host behavior: `SOURCE_ABSENT` stays
after resolving account Sources while the client is absent, and live account
values replace it after opening the client. This establishes missing identity
and recovery for the tested host path. Retained Global Variables reflect skipped
absent assignments; do not change missing Sources to empty strings.

Store reviewed real captures in `observations/` with a report based on
[the result template](windows-results-template.md). Preserve provenance and
sequence timing. The synthetic fixture in `tests/fixtures/` is intentionally a
partial roster and must never be relabeled as a real capture.

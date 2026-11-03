# Windows acquisition result: windows-session-03 (Flex)

Status: **Partial real-client verification recorded**. The operator reported
playing a Flex game. The full actual-client capture confirms queue 440,
independent ranked inputs, complete compositions and account associations,
native game events including `GameEnd / Win`, and post-game lifecycle behavior.
Together with [Solo/Duo session-02](2026-11-03-windows-session-02.md), this
establishes both ranked-queue acquisition paths. Normal games and the other
unexercised runbook scenarios remain open in issue #1.

## Environment and provenance

- Capture UTC: 2026-11-03T15:17:05.189Z–2026-11-03T16:02:29.340Z.
- Recorded commit: `365edb10e14e166f495a69146e9703afdbdc61ce`, **dirty checkout**;
  the baseline commit does not identify the complete locally modified tree.
- Windows release `10.0.26300`, Node `v22.23.4`, configured package manager
  `pnpm@10.34.3`. Edition, process elevation and exact visible Fluxta/client
  versions were not separately recorded.
- Every version probe returned
  `16.21.8342754+branch.releases-16-21.code.public.content.release.anticheat.vanguard`.
- Session preparation records `pnpm check: passed`, CLI `plugin-running`,
  capture completed, no failed stage. It does not record per-Source/indicator
  host assertions; prior operator confirmation was partial and supplied no
  screen timestamps.
- Full source: **1,691 frames, 39,947,256 bytes**, SHA-256
  `d1590df3f6dae18efb273b88bc6558ab26fb960dfc33b20fa84291de032ddde8`.
  The source was available and streamed in full at review; its measured hash
  matches the extractor summary.
- All 97 extractor-retained JSONL lines, including the header, match their
  original source lines. All 131 deduplicated event records match payloads and
  request timestamps at their original source lines. No credential/raw-error
  fields or unaliased identity values were found in the projected source.

The [representative sample](2026-11-03-windows-session-03/evidence.jsonl) preserves
complete original line contents. Its
[index](2026-11-03-windows-session-03/evidence-index.jsonl) maps sample lines to
the **original full-capture line numbers** used below. Retained
[events](2026-11-03-windows-session-03/events.jsonl),
[session metadata](2026-11-03-windows-session-03/session.json) and
[provenance manifest](2026-11-03-windows-session-03/provenance.json) accompany it.
Aliases are consistent within a capture; equal aliases in different captures
are not evidence that the underlying identifiers are equal.

## Client, queue and account

The collector remains `available / identified` in **all 1,691 frames**.
Account, phase, session, ranked and version endpoints return HTTP 200 throughout.
The client stays available both before Live becomes reachable and after it
disappears. This session starts in `Lobby` and ends in `Lobby`; it adds no client
absence, sign-out, account-change or restart evidence.

The queue is consistently `gameData.queue.id: 440`,
`type: RANKED_FLEX_SR`, `gameMode: CLASSIC`, `mapId: 11`. Live independently
reports `gameMode: CLASSIC`, `mapName: Map11`, `mapNumber: 11`. Direct
`gameData.mapId/gameMode` values are absent from the retained projection, as in
session-02; do not assume a different field location.

All **1,503 complete LCU observations** contain two teams of five, ten nonzero
champion ids, ten unique nonempty PUUID aliases and exactly one current-account
PUUID match. The local account is on **`teamTwo`**, `championId: 99`,
`selectedPosition: UTILITY`.

All **1,477 successful Live observations** contain ten champion entries,
`ORDER: 5` and `CHAOS: 5`. In every one, the same observation's current-account
full Riot ID equals `activePlayer.riotId` and exactly one roster entry:
**Lux, `CHAOS`, `UTILITY`**. The sorted player/champion/team/position roster is
stable across these responses. Live player data has no observed PUUID or
summoner id. The current account bridges its PUUID in LCU to its complete Riot
ID in Live; array order and similarity of display names are not used.

This also exercises the opposite team to session-02, where the local participant
was on `teamOne / ORDER`. Never assume the local player belongs to the first
team or the first array entry.

## Independent ranked inputs

The ranked response contains six `queues` entries plus `queueMap`. The two
relevant array/map records agree. Both have `isProvisional: false` and
`provisionalGamesRemaining: 0`.

| Queue             | Before game, source line 2                  | First changed response, source line 1672    |
| ----------------- | ------------------------------------------- | ------------------------------------------- |
| `RANKED_SOLO_5x5` | `GOLD`, `II`, 51 LP; wins 263, losses 238   | Unchanged                                   |
| `RANKED_FLEX_SR`  | `SILVER`, `IV`, 42 LP; wins 284, losses 280 | `SILVER`, `IV`, 62 LP; wins 285, losses 280 |

The Flex update is first observed in request
`2026-11-03T16:01:56.385Z`–`16:01:56.406Z`, in the frame where phase changes to
`PreEndOfGame`. It agrees with native `GameEnd.Result: Win`. Session-02 changed
only Solo, and this session changes only Flex: independent updates have now
been observed in both directions. This is acquisition evidence, with no runtime
rank persistence introduced. A visibly confirmed unranked input remains untested.

## Lifecycle and retained post-game data

| Source line | Phase request completed UTC | Value          |
| ----------- | --------------------------- | -------------- |
| 2           | 15:17:05.768                | `Lobby`        |
| 7           | 15:17:13.902                | `Matchmaking`  |
| 81          | 15:19:14.798                | `ReadyCheck`   |
| 85          | 15:19:21.590                | `ChampSelect`  |
| 190         | 15:22:04.871                | `InProgress`   |
| 1672        | 16:01:56.174                | `PreEndOfGame` |
| 1679        | 16:02:08.238                | `EndOfGame`    |
| 1687        | 16:02:21.144                | `Lobby`        |

All times are on 2026-11-03. No `GameStart` phase occurs anywhere in the full
capture; the native `GameStart` event is a separate input.

`gameData.gameId` changes from 0 to the nonzero within-file alias 1 at line 190.
**The old game id and both full team arrays remain present after returning to
`Lobby`**, including the final session request at
`16:02:29.318Z`–`16:02:29.339Z` (line 1692). The queue still says Flex.
Consequently, a nonzero game id, queue metadata, complete composition or account
join alone does not establish an active game. Later match classification must
interpret lifecycle and avoid treating retained post-game data as a new active
match. No match behavior is implemented by this review.

Live first fails after the game at line 1673, while phase is `PreEndOfGame`.
It was still reachable at line 1672. Together with session-02, this demonstrates
that the relative timing of Live disappearance, native end events and LCU end
phases varies; transport failure alone is not a completion signal.

## Composition availability and clock

| Measurement                                         | Full-source observation                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Last incomplete LCU teams                           | Line 189, session request `15:22:03.185Z`–`15:22:03.199Z`, `ChampSelect`, teams 0+0.                                            |
| First complete LCU teams                            | Line 190, session request `15:22:04.872Z`–`15:22:04.891Z`, `InProgress`, teams 5+5, complete champion/PUUID fields.             |
| Account response for that LCU association           | Line 190, `15:22:04.860Z`–`15:22:04.870Z`; exactly one PUUID match on `teamTwo`.                                                |
| First successful complete Live response             | Line 196, `15:22:15.095Z`–`15:22:15.104Z`, ten players and complete local account association; `gameTime: 0.03285270184278488`. |
| Account response for that Live association          | Line 196, `15:22:15.057Z`–`15:22:15.067Z`; full Riot ID matches Lux and `activePlayer` exactly.                                 |
| Last response with the initial frozen clock         | Line 242, completed `15:23:25.742Z`; still `gameTime: 0.03285270184278488`.                                                     |
| First advancing clock / native `GameStart` observed | Line 243, Live request `15:23:27.323Z`–`15:23:27.333Z`, `gameTime: 1.456326961517334`; event time `0.03285270184278488`.        |
| Last successful Live response                       | Line 1672, `16:01:56.410Z`–`16:01:56.423Z`, `gameTime: 2310.4765625`, phase `PreEndOfGame`.                                     |

These first-availability points were checked against **every full-source frame**.
The first complete LCU response completes **10.213 seconds before** the first
complete Live response. Live has a complete roster for **70.638 seconds of
observed wall time while its clock remains at the initial value**, before the
first advancing-clock response. In session-02 the corresponding observed frozen
interval was much shorter. This reinforces that `InProgress`, Live reachability,
full roster availability and a small nonzero game clock do not supply a visible
map-entry timestamp. Exact loading/map screen times were not recorded.

Each frame consists of separate timed requests. The data establish composition
and identity availability, not an atomic cross-API snapshot or the exact server
readiness instant. Loading-screen completeness cannot be certified solely from
these API labels; retain the documented in-map fallback when early data are
incomplete in another client/queue.

LCU `teamOne` champion ids are `[106, 147, 22, 72, 90]`; `teamTwo` ids are
`[99, 19, 711, 21, 86]`. Live `ORDER` contains Volibear, Seraphine, Ashe, Skarner
and Malzahar; `CHAOS` contains Lux, Warwick, Vex, Miss Fortune and Garen.
Positions are present, including `UTILITY` for the current player.

## Native events and result

The full source and derived event stream agree on **131 unique EventIDs, 0–130**,
across **14 names**, in one observation segment. Every derived event payload and
its original request timestamps were checked against its full-source frame.
The extractor reports no window gaps; the observed IDs are contiguous.

| EventName         | Count | First source line | Additional retained fields / omission                                               |
| ----------------- | ----- | ----------------- | ----------------------------------------------------------------------------------- |
| `GameStart`       | 1     | 243               | None                                                                                |
| `MinionsSpawning` | 1     | 261               | None                                                                                |
| `ChampionKill`    | 78    | 414               | `KillerName`, `VictimName`, `Assisters`                                             |
| `FirstBlood`      | 1     | 414               | `Recipient`                                                                         |
| `DragonKill`      | 5     | 531               | `DragonType`, `Stolen`, `KillerName`, `Assisters`                                   |
| `HordeKill`       | 3     | 555               | `Stolen`, `KillerName`, `Assisters`                                                 |
| `TurretKilled`    | 18    | 731               | `TurretKilled`, `KillerName`, `Assisters`                                           |
| `FirstBrick`      | 1     | 731               | `KillerName`                                                                        |
| `Multikill`       | 12    | 746               | `KillStreak`, `KillerName`                                                          |
| `InhibKilled`     | 3     | 1104              | `InhibKilled`, `KillerName`, `Assisters`                                            |
| `BaronKill`       | 2     | 1147              | `Stolen`, `KillerName`, `Assisters`                                                 |
| `InhibRespawned`  | 2     | 1292              | Field `InhibRespawned` is named in metadata; its value is omitted by the collector. |
| `Ace`             | 3     | 1335              | `Acer`/`AcingTeam` values are omitted; names remain in metadata.                    |
| `GameEnd`         | 1     | 1671              | `Result: Win`                                                                       |

All include `EventID`, `EventName`, `EventTime`. `Stolen` remains a **string**;
the observed value in this game is `"False"`. `InhibRespawned` is new compared
with session-02; the capture demonstrates the event name and time, but cannot
identify the inhibitor from its omitted field value. No `HeraldKill` occurs in
this recording; it was observed in session-02. Across both runs there are 15
distinct observed event names, not a claim about the complete API event catalog.

Native `GameEnd` (EventID 130) is first returned at line 1671 in request
`16:01:54.366Z`–`16:01:54.381Z`, while phase still reports `InProgress`.
`EventTime` is `2308.4248046875`, and `Result` is **`Win`**. Its response completes
**1.793 seconds before** the first `PreEndOfGame` phase response; `EndOfGame`
follows at line 1679. In Solo/Duo session-02 no `GameEnd` was retained. This run
therefore establishes that the native end/result input is available, while the
earlier run shows that collection cannot assume it will always be observed.

## Remaining work

- Both Solo/Duo and Flex now have actual match evidence. A normal Summoner's
  Rift game, visibly confirmed unranked representation, controlled local
  failure/recovery, reachable signed-out/account-change behavior, client
  restart/credential rotation and Fluxta connection replay remain unverified.
- Exact visible loading/map times, visible app/client versions and privilege
  context remain unrecorded. This review does not create missing measurements.
- Host Source/External Connection values are separate from collector state;
  session metadata supplies only CLI plugin-running status.
- Omitted `InhibRespawned`, `Acer` and `AcingTeam` values need an explicit future
  allowlist change if required. No unavailable value is guessed here.
- The review updates local findings and retained evidence. No remote issue
  checkbox/comment or runtime rank/match behavior was changed.

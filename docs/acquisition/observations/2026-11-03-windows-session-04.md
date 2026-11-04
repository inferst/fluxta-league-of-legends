# Windows acquisition result: windows-session-04 (normal draft)

Status: **Partial real-client verification recorded**. The operator reported
playing normal draft. The full Windows capture confirms one game in queue
**400 / NORMAL**, Summoner's Rift, with complete compositions and current-account
associations. Ranked values remain unchanged during this recording. Together
with [Solo/Duo session-02](2026-11-03-windows-session-02.md) and
[Flex session-03](2026-11-03-windows-session-03.md), this covers the three queue
families required by the acquisition runbook. Separate failure/account/restart
scenarios and precise visible loading times remain unverified.

## Provenance

- Capture UTC: 2026-11-03T17:31:04.622Z–2026-11-03T18:10:41.792Z.
- Recorded baseline: `365edb10e14e166f495a69146e9703afdbdc61ce`, **dirty checkout**.
- Windows release `10.0.26300`, Node `v22.23.4`, configured package manager
  `pnpm@10.34.3`. Exact visible app/client versions and privilege context were
  not recorded. The unchanged local build string is
  `16.21.8342754+branch.releases-16-21.code.public.content.release.anticheat.vanguard`.
- Preparation records `pnpm check: passed`, CLI `plugin-running`, capture
  completed, no failed stage. This does not supply missing per-Source UI readings.
- Full source: **1,468 frames, 32,119,020 bytes**, measured SHA-256
  `e7bc18fcecddd98a64186718ba53c1bec527ccc8c4f69a592ea66fb852a1c1a9`, matching
  the extractor summary.
- Every frame was streamed at review. All **79 extractor-retained lines**,
  including the header, match the full source. All **70 derived event records**
  match their original payloads and request timestamps. No credential/raw-error
  fields or unaliased identity values were found in the projected source.

Reviewed artifacts: [representative full lines](2026-11-03-windows-session-04/evidence.jsonl),
[original-line mapping](2026-11-03-windows-session-04/evidence-index.jsonl),
[native events](2026-11-03-windows-session-04/events.jsonl),
[session metadata](2026-11-03-windows-session-04/session.json),
[provenance manifest](2026-11-03-windows-session-04/provenance.json).
Line numbers below refer to the **original full capture**, not the subset.
Aliases are scoped within each capture; equal aliases across sessions do not
establish that the underlying account/game identifiers are equal.

## Queue, lifecycle and post-game metadata

The queue is `gameData.queue.id: 400`, `type: NORMAL`, `gameMode: CLASSIC`,
`mapId: 11` from the initial lobby through the active game and `EndOfGame`.
This is the operator's normal **draft** run, not evidence for blind, Quickplay
or Swiftplay. Live independently reports `CLASSIC`, `Map11`, map number 11.
Direct `gameData.mapId/gameMode` values remain absent from the projection.

| Source line | Request completed UTC | Lifecycle observation                                                 |
| ----------- | --------------------- | --------------------------------------------------------------------- |
| 2           | 17:31:05.172          | Phase endpoint: `Lobby`                                               |
| 10          | 17:31:17.809          | Phase endpoint: `Matchmaking`                                         |
| 27          | 17:31:44.867          | Phase endpoint: `ReadyCheck`                                          |
| 31          | 17:31:51.438          | Phase endpoint: `ChampSelect`                                         |
| 150         | 17:35:01.772          | Phase endpoint: `InProgress`                                          |
| 1435        | 18:09:43.880          | Session endpoint: `PreEndOfGame`; phase endpoint failed in this frame |
| 1436        | 18:09:45.622          | Phase endpoint: `PreEndOfGame`                                        |
| 1442        | 18:09:55.742          | Phase endpoint: `EndOfGame`                                           |
| 1444        | 18:09:59.009          | Phase endpoint: `Lobby`                                               |

All times are on 2026-11-03. No `GameStart` phase occurs; the native event of
that name is a different input.

At source line **1444**, the session changes to `Lobby` and its queue changes
to **440 / RANKED_FLEX_SR**, while retaining the **same game-id alias 1 and
the normal game's full teams**. That combination persists through the final
session response at `18:10:41.759Z`–`18:10:41.790Z` (line 1469).

The summary's queue-id set `{400, 440}` therefore does **not** demonstrate two
played games. There is one nonzero game-id alias and one observed Live game.
Later match behavior must associate queue metadata with the game's active
lifecycle; post-game lobby metadata must not relabel the completed normal game
as Flex or create a new active match. Session-03 already showed retained
post-game rosters/game id; this run additionally demonstrates a changed queue
alongside that retained data. The cause of the lobby queue change was not recorded.

## Current account, compositions and availability

All **1,468 frames** remain `available / identified`; one account PUUID alias
occurs in the recording. Account, session, ranked and version requests all
succeed. Client absence, sign-out, account switch and restart were not exercised.

All **1,320 complete LCU observations** have two teams of five, ten nonzero
champion ids, ten unique nonempty PUUID aliases and exactly one current-account
PUUID match: **`teamOne`, champion id 12, `UTILITY`**. All **1,279 successful
Live observations** have a full 5+5 roster, a unique `activePlayer` roster match
and the same observation's complete account Riot ID matching **Alistar,
`ORDER`, `UTILITY`**. The sorted identity/champion/team/position roster is stable.
Live player entries contain no observed PUUID or summoner id. The current-account
bridge supplies the local association; array ordering is not used.

| Measurement                                       | Full-source evidence                                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Last incomplete LCU teams                         | Line 149, session request `17:35:00.175Z`–`17:35:00.193Z`, `ChampSelect`, teams 0+0, game-id 0.                             |
| First complete LCU teams                          | Line 150, session request `17:35:01.776Z`–`17:35:01.797Z`, `InProgress`, teams 5+5, game-id alias 1.                        |
| Account used for that LCU join                    | Line 150, `17:35:01.764Z`–`17:35:01.775Z`, current PUUID matches exactly one participant.                                   |
| Last initial failed Live request                  | Line 154, `17:35:09.094Z`–`17:35:09.099Z`, HTTP 404.                                                                        |
| First complete Live response                      | Line 155, `17:35:10.746Z`–`17:35:10.757Z`, full composition and exact local Riot ID join, `gameTime: 0.030470000579953194`. |
| Account used for that Live join                   | Line 155, `17:35:10.701Z`–`17:35:10.711Z`.                                                                                  |
| Last initial frozen clock                         | Line 217, completed `17:36:48.285Z`, still `gameTime: 0.030470000579953194`.                                                |
| First advancing clock / native GameStart observed | Line 218, `17:36:49.886Z`–`17:36:49.895Z`, `gameTime: 1.3821772336959839`; event time `0.030469899997115135`.               |
| Last successful Live response                     | Line 1433, `18:09:37.993Z`–`18:09:38.004Z`, `gameTime: 1969.4320068359375`, 70 total events.                                |

The first complete LCU response completes **8.960 seconds earlier** than the
first complete Live response. The initial Live clock stays frozen for an
observed **97.528 seconds** after the roster is available. First-availability
positions were checked against every full-source frame, but polling still does
not measure exact server readiness or an atomic cross-API snapshot. Exact screen
loading/map times were not recorded; Live reachability, a small nonzero clock
and `InProgress` alone do not prove that the visible map has appeared.

LCU champion ids: `teamOne [34, 222, 233, 12, 86]`,
`teamTwo [497, 90, 72, 202, 54]`. Live `ORDER`: Anivia, Jinx, Briar, Alistar,
Garen. Live `CHAOS`: Rakan, Malzahar, Skarner, Jhin, Malphite. Positions are
present for all players. These are compositions observed after champion select;
hover choices and guessed ordering are not used as identity evidence.

## Ranked values during the normal game

Both `queues` (six entries) and `queueMap` are returned. Their relevant Solo/Flex
entries agree and remain unchanged throughout all **1,468 ranked responses**:

| Queue             | Entire recording                            |
| ----------------- | ------------------------------------------- |
| `RANKED_SOLO_5x5` | `GOLD`, `II`, 51 LP; wins 263, losses 238   |
| `RANKED_FLEX_SR`  | `SILVER`, `IV`, 41 LP; wins 285, losses 282 |

For both, `isProvisional` is `false`, `provisionalGamesRemaining` is 0.
The 41 Flex LP is **already present at the first source frame**. Session-03
ended at 62 Flex LP and 280 losses; the intervening history is not captured
here, and account aliases cannot establish cross-file continuity. Do not
attribute that cross-session difference to this normal game. This recording
shows no Solo/Flex rank update during the normal match. A non-ranked game is
not a visibly confirmed unranked ranked-queue/account input.

## Endpoint failure and game completion

At line **1435**, the phase request
`18:09:42.195Z`–`18:09:43.705Z` has status **0**, while the parallel account
request succeeds at `18:09:42.196Z`–`18:09:42.215Z`. The collector correctly
remains `available / identified`. The later session request in that frame
returns HTTP 200 and `PreEndOfGame`; the next phase request also succeeds.
This establishes an actual phase-endpoint interruption without loss of current
account reachability. It is not the controlled whole-local-API failure test.

Live first fails at line 1434 while the phase and session still say `InProgress`.
Separate later responses establish `PreEndOfGame` and `EndOfGame`. No native
**`GameEnd`** or **`Result`** appears anywhere in the full recorded source.
The game completion lifecycle is observed; **win/loss cannot be determined from
this capture**. Neither transport failure nor unchanged ranked values supplies
that missing result.

## Native happenings

The full source and derived event file agree on **70 unique EventIDs, 0–69**,
in one observation segment, across **11 names**. Every derived payload and its
request timestamps was matched to its original frame. The extractor reports
no window gaps; contiguous IDs do not prove an unobserved final event never
appeared after Live became unreachable.

| EventName         | Count | First source line |
| ----------------- | ----- | ----------------- |
| `GameStart`       | 1     | 218               |
| `MinionsSpawning` | 1     | 236               |
| `ChampionKill`    | 43    | 278               |
| `FirstBlood`      | 1     | 278               |
| `DragonKill`      | 5     | 474               |
| `HordeKill`       | 3     | 551               |
| `Multikill`       | 5     | 687               |
| `TurretKilled`    | 8     | 781               |
| `FirstBrick`      | 1     | 781               |
| `HeraldKill`      | 1     | 818               |
| `Ace`             | 1     | 1140              |

`Stolen` again includes string values `"True"` and `"False"`. Ace's `Acer` and
`AcingTeam` names are preserved in `_observedKeys`, but their values were not
collected. No new event name is added to the 15-name union from sessions 02/03.
All three games together retain 296 event records, with EventIDs scoped per game.

## Queue coverage and remaining work

| Run        | Played queue       | LCU complete before Live    | Native result   | Ranked observation                           |
| ---------- | ------------------ | --------------------------- | --------------- | -------------------------------------------- |
| Session-02 | 420 / Solo-Duo     | 8.501 s (retained evidence) | Not retained    | Solo 31→51 LP, Flex unchanged                |
| Session-03 | 440 / Flex         | 10.213 s (full source)      | `GameEnd / Win` | Flex 42→62 LP, Solo unchanged                |
| Session-04 | 400 / normal draft | 8.960 s (full source)       | Not recorded    | Both ranked queues unchanged within this run |

Required match-queue coverage is now recorded for this Windows/client build.
This does not extend normal coverage to other normal variants or complete the
entire runbook. Visibly confirmed unranked inputs, sign-out/account change,
controlled local failure/recovery, credential rotation/restart and Fluxta
connection replay remain unverified. Exact loading/map screen measurements,
visible app versions and privilege context remain unrecorded. Collector state
does not supply missing host Source/indicator readings. Keep issue #1 open for
those acceptance checks. This review changes local evidence/findings, not remote
issue checkboxes or runtime rank/match behavior.

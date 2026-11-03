# Windows acquisition result: windows-session-05 (Solo/Duo lobby)

Status: **Real-client no-game/account-recovery evidence recorded**. The operator
started collection with League already running, opened Solo/Duo and stopped
collection. The full source records `None → Lobby` for queue 420. No
`Matchmaking`, champion selection or game is observed before the recording ends.
Separately, the operator confirms that switching accounts changes the observed
account value; that manual check is recorded in the
[account/restart report](2026-11-03-manual-account-recovery.md).

## Provenance

- Capture UTC: 2026-11-03T20:42:11.188Z–2026-11-03T20:42:59.878Z.
- Baseline commit `365edb10e14e166f495a69146e9703afdbdc61ce`, **dirty checkout**.
- Windows release `10.0.26300`, Node `v22.23.4`, configured package manager
  `pnpm@10.34.3`; visible app versions and privilege context were not recorded.
- Local version endpoint returns
  `16.21.8342754+branch.releases-16-21.code.public.content.release.anticheat.vanguard`.
- Preparation records `pnpm check: passed`, CLI `plugin-running`, capture
  completed, no failed stage. Source/indicator UI assertions are not in this file.
- Full original: **29 frames, 214,378 bytes**, measured SHA-256
  `9b68d8160e2f4733923cbec750667010fdb1ea8cce3294f97b32642df2db497a`, matching
  the extractor summary. Every full-source frame was reviewed; all **10 retained
  JSONL lines**, including the header, match their original source lines.
- No credential/raw-error fields or unaliased identity values were found in the
  projected source. The native event file is empty.

All nine extractor-retained frames are preserved, with the original header:
[evidence](2026-11-03-windows-session-05/evidence.jsonl),
[source-line index](2026-11-03-windows-session-05/evidence-index.jsonl),
[empty event file](2026-11-03-windows-session-05/events.jsonl),
[session metadata](2026-11-03-windows-session-05/session.json),
[provenance](2026-11-03-windows-session-05/provenance.json).
Line references below are to the original full capture. Aliases are within-file
identifiers, not evidence of account equality between separate captures.

## Client available without a game

`clientState` remains **`available` in all 29 observations**. Every phase probe
returns HTTP 200. Live returns status 0 throughout, and no participant roster,
native event or active game appears.

| Source lines | Observed state                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| 2–16         | Phase `None`, session HTTP 404, account identified, client available.                                              |
| 17–30        | Phase/session `Lobby`, queue `420 / RANKED_SOLO_5x5`, mode `CLASSIC`, map 11, `gameId: 0`, both team arrays empty. |

The first `Lobby` phase response completes at `20:42:36.421Z` (line 17); its
session request runs `20:42:36.427Z`–`20:42:36.460Z`. The final completed
observation at `20:42:59.878Z` (line 30) is still `available / identified`,
`Lobby`, game-id 0, teams 0+0. Thus selecting a queue and entering its lobby is
distinct from starting matchmaking or an active game. Stopping the collector
does not establish client disappearance or a game-end event.

## Account endpoint failure and recovery

| Source line | Account request UTC              | Status / result                                         | Other evidence                                                                                  |
| ----------- | -------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 17          | Successful preceding observation | HTTP 200, `identified`                                  | Client available; phase Lobby.                                                                  |
| 18          | `20:42:38.423Z`–`20:42:39.935Z`  | **Status 0, `data: null`, `accountState: unavailable`** | Phase request `20:42:38.422Z`–`20:42:38.437Z` returns HTTP 200 / Lobby; client stays available. |
| 19          | `20:42:41.630Z`–`20:42:41.646Z`  | HTTP 200, `identified` restored                         | Same account PUUID and full Riot ID as before the interruption, using within-file aliases.      |

The failed account request lasts 1.512 seconds; status 0 does not distinguish
the exact transport/deadline cause. Completed observations change from
`available / unavailable` at `20:42:39.968Z` to `available / identified` at
`20:42:41.678Z` (**1.710 seconds later**). No manual recovery action is recorded.
All 28 successful account responses have a complete nonempty PUUID and Riot ID,
and the same within-file account alias.

This is real evidence that a reachable client can have an **unavailable
account** and recover on the next poll. It differs from `unidentified`, which
requires a usable no-identity response such as HTTP 404. The failed response
contains no cached account payload. The implementation and existing behavior
tests specify absent account Sources on failures; this capture itself does not
record direct host Source resolutions. The previously documented
`SOURCE_ABSENT` marker check remains unreported.

The separately operator-confirmed account switch is not visible in this capture:
all successful responses here refer to one account. Do not reinterpret transient
unavailability and recovery to the same account as an observed account switch.
Nor is this a controlled whole-local-API outage: phase/session/version/ranked
requests remained reachable.

## Ranked inputs

Every ranked request returns HTTP 200, six `queues` entries and a `queueMap`.
Relevant array/map entries agree and remain unchanged in all 29 responses:

| Queue             | Entire recording                            |
| ----------------- | ------------------------------------------- |
| `RANKED_SOLO_5x5` | `GOLD`, `II`, 51 LP; wins 263, losses 238   |
| `RANKED_FLEX_SR`  | `SILVER`, `IV`, 19 LP; wins 286, losses 284 |

Both have `isProvisional: false`, `provisionalGamesRemaining: 0`. The 19 Flex LP
is already present at the first frame. Differences from earlier recordings do
not establish a rank change during this lobby-only session or cross-file
account continuity. This is not an unranked account/queue input.

## Verification progress

- Reconfirms client availability while no game is running, including session
  HTTP 404 and Live status 0.
- Adds actual account-endpoint failure/recovery while client reachability stays
  established, complementing session-04's isolated phase-request failure.
- Operator confirmation now covers account-value replacement when switching,
  as well as previously reported login/restart recovery. Exact identifiers and
  timings for the manual switch were not supplied.
- Adds no match, roster-readiness, result or native-event coverage beyond the
  three completed-game reports. No extra game was required for these facts.
- Remaining checks include controlled whole-API inaccessibility, a visibly
  confirmed unranked input and actual-host identity absence via the marker test.
  Exact loading screen times, visible versions and privilege context remain
  incomplete; operator reports remain distinct from captured API observations.

No runtime account/rank/match behavior or remote issue checkbox is changed by
this review.

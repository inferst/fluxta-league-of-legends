# Windows verification summary

Status: **Agreed hands-on verification pass complete, with recorded exceptions
and measurement limits.** This summary combines actual-client captures and
operator-reported host checks. It is ready for issue/PR review; it does not
assert exhaustive Windows/client support or change remote acceptance checkboxes.

## Recorded environment

- Windows release `10.0.26300`, Node `v22.23.4`, configured pnpm `10.34.3`.
- Local League version response:
  `16.21.8342754+branch.releases-16-21.code.public.content.release.anticheat.vanguard`.
- Captures identify baseline commit `365edb10e14e166f495a69146e9703afdbdc61ce`
  with a **dirty checkout**; that commit alone is not the complete tested tree.
- Exact visible Fluxta/client versions, Windows edition and process elevation
  were not separately recorded. Preparation logs report `pnpm check` passed
  and the CLI reports the plugin running. Published SDK/CLI remain repository
  catalog dependencies; no host or installed-package changes implement this pass.

## Actual-client observations

| Evidence                                                       | Observed result                                                                                                                                                                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Session-02: Solo/Duo](2026-11-03-windows-session-02.md)       | Queue 420; complete 5+5 compositions and current-account joins; Solo Gold II 31→51 LP, Flex unchanged; 95 native events. Full source unavailable at review; retained lines/events and reported source hash preserved.                       |
| [Session-03: Flex](2026-11-03-windows-session-03.md)           | Queue 440; full 5+5 compositions, account on teamTwo/CHAOS; Flex Silver IV 42→62 LP, Solo unchanged; 131 events including GameEnd/Win. Full-source hash, retained lines and derived events verified.                                        |
| [Session-04: normal draft](2026-11-03-windows-session-04.md)   | Queue 400 during play; complete 5+5 compositions and account joins; ranked inputs unchanged within this recording; 70 events. Post-game Lobby changes queue to 440 while keeping the normal game's id/teams. Full-source evidence verified. |
| [Session-05: Solo/Duo lobby](2026-11-03-windows-session-05.md) | None→Lobby, queue 420, game-id 0, no game. One account-request failure leaves the client available and recovers to the same account next poll. Full-source evidence verified.                                                               |

Across the three games, 296 native event records cover 15 distinct event names.
Native GameEnd/Result is demonstrated by Flex but absent from the Solo/normal
recordings; Live failure alone does not establish a game end or win/loss.

Complete compositions and the local account association are available from LCU
and Live. LCU completes 8.501 / 10.213 / 8.960 seconds earlier than Live in the
Solo/Flex/normal runs. These are poll timings, not exact server or visible-screen
readiness times. Live's initial clock can remain frozen after full roster data
is available. Precise loading/map-entry screen times are unrecorded; preserve
the documented in-map fallback when early compositions are incomplete.

## Operator-confirmed host checks

The [manual account/restart report](2026-11-03-manual-account-recovery.md) records:

| Check                                      | Confirmed result                                                                                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sign-out                                   | unavailable account, clientAvailable false, clientState absent for this client's sign-out behavior.                                                                |
| Login                                      | identified account and available client restored.                                                                                                                  |
| Account change                             | The observed account value changes to reflect the switch.                                                                                                          |
| League restart                             | Automatic connection recovery.                                                                                                                                     |
| Fluxta restart                             | Source values and connection restored.                                                                                                                             |
| Missing identity and subsequent resolution | With clientState absent, accountId/accountName assignments leave SOURCE_ABSENT in both test variables; opening the client replaces the marker with account values. |

The marker result confirms that old Global Variable contents were retained
assignments. The tested absent Source queries do not reassign the old identity.
The SDK's null/absent contract and the plugin's existing behavior tests agree
with this host observation. This is an operator-reported check, without exact
identity values, action times or a new JSONL trace.

## Accepted not-run items and other limits

- **Whole-local-API outage:** explicitly deferred by agreement. Automated
  request-failure/identity-clearing tests, actual startup inaccessibility and
  isolated account/phase failures provide coverage for related behavior. An
  induced complete outage after identification was not performed on the host.
- **Unranked input:** explicitly not run because no suitable account is
  available. The real unranked response representation remains unknown; missing
  rank data, zero LP or an API error must not be treated as verified unranked.
- Manual sign-out closes the client, so it does not establish a reachable
  unidentified account. Exact privilege/token-rotation facts and visible app
  versions were not separately recorded; credentials were not logged.
- Exact visible loading/map times remain unmeasured. No blanket guarantee of
  loading-screen completeness or universal native end-event delivery is made.
- Stored participant/account/game identifiers are within-file pseudonyms.
  Equal aliases across different files do not prove cross-session identity.

There are no further operator actions requested for this agreed pass. Future
features must preserve the recorded unknowns. Rank persistence and full runtime
match behavior remain separate tickets; this work records their acquisition
inputs and the current account/connection capability.

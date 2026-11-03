# Manual account and restart checks

Status: **Operator-reported Windows checks recorded**. These observations were
reported in conversation after the three match captures. They are not additional
JSONL evidence; no exact action timestamps, latencies, app versions or identity
values were supplied.

| Action                                      | Reported public result                                                                                | Assessment                                                                                                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign out                                    | `accountState: unavailable`, `clientAvailable: false`, `clientState: absent`                          | Expected sign-out variant where the League Client process disappears. Does not exercise a reachable but unidentified account.                                    |
| Sign back in                                | `accountState: identified`, `clientAvailable: true`, `clientState: available`                         | Operator confirms state recovery after login.                                                                                                                    |
| Switch account                              | The observed account value changes                                                                    | Operator confirms identity-value replacement when switching. Exact per-field identifiers/timing were not supplied; this is separate from missing-value clearing. |
| Restart League                              | Connection recovers automatically                                                                     | Operator-reported automatic restart recovery. Credential values/rotation were not separately recorded.                                                           |
| Restart Fluxta                              | Values and connection are restored                                                                    | Operator-reported host Source/connection recovery. No assertion about the internal restoration mechanism is inferred.                                            |
| Inspect account id/name after sign-out      | Previous values remain **in Global Variables after Set Variable**                                     | This is not a direct observation that the plugin Sources retain an old account. See the verification procedure below.                                            |
| Resolve account Sources with a fresh marker | `SOURCE_ABSENT` remains while the client is absent; actual values replace it after opening the client | **PASS, operator-confirmed on 2026-11-04.** Missing identity is absent through the actual host query; values resolve again once the client is available.         |

## Missing Sources and retained variables

The operator explicitly confirmed that the old identity is displayed in Global
Variables assigned through `Set Variable`. Global Variables store previous
assignments independently of the plugin's current observation. An absent Source
can leave an assignment unchanged, as described in the Windows runbook.

The plugin's `LeagueObservation.read()` starts each completed observation with
`accountId: null` and `accountName: null`; no discovered client leaves them null.
`registerLeague` resolves both Sources directly from that current observation.
The installed published SDK 0.8.0 `Source.resolve` contract defines `null` or
`undefined` as an absent value, and its transport sends a null result rather than
a previous value. The existing public-boundary behavior test checks that both
registered account Sources resolve to null after an identified client closes.
That automated evidence uses synthetic external I/O and does not substitute for
reading the Sources in the actual host.

The subsequent operator-confirmed marker check establishes skipped assignment
of an absent value as the explanation for retained Global Variables in this
tested scenario. No old identity overwrote the marker. Returning an empty string
from the plugin would change the absent-value contract and is not warranted by
this report.

## Concrete verification and scenario setup

With League signed out/closed and `clientState: absent`, set the two test Global
Variables to a distinct literal such as `SOURCE_ABSENT`. Then execute only their
two `Set Variable` actions using `lol.accountId` and `lol.accountName`:

- If the marker remains, the query supplies no value to assign; the previous
  account is not being returned by these reads. This is consistent with the
  null/absent contract (which also treats query failure as absence).
- If the old identity overwrites the marker, the actual host path is returning
  or reusing old data. Record the reproduction without real identity values and
  investigate it; do not classify it as passed identity clearing.

**Observed result, reported on 2026-11-04:** the operator confirms that
`SOURCE_ABSENT` remains after the Source assignments while the client is absent.
After opening the client, account values are assigned. This confirms absent
account identity and recovery through the actual host path for this scenario.
Exact identity values and action times were not supplied and are not needed in
the shared report. The check is complete; it is no longer a pending request.

For ongoing scenario use, explicitly reset both destination variables to a
literal placeholder such as `NO_ACCOUNT` **before every resolution**, then apply
the account Sources. A missing Riot ID can occur even when a PUUID identifies
the account, so resetting both destinations is safer than resetting only when
`accountState` differs from `identified`. For an active-account condition, query
the current Sources and state; never treat a retained variable alone as current
account identity. No actual identifier belongs in this report.

## Explicitly skipped checks for this verification pass

Scope exceptions recorded on 2026-11-04.

| Check                                                   | Status and reason                                                                                                                | Evidence boundary                                                                                                                                                                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Controlled whole-local-API inaccessibility and recovery | **NOT RUN / DEFERRED**, omitted by agreement in conversation.                                                                    | Automated tests exercise request failure and identity clearing; actual captures contain startup inaccessibility and isolated phase/account failures with recovery. An induced whole-API outage after identification was not tested on the actual host. |
| Visibly confirmed unranked ranked-queue/account input   | **NOT RUN**, operator has no suitable unranked Solo/Duo or Flex account/queue. Skipping was accepted for this verification pass. | Ranked Solo/Flex inputs are observed; the actual unranked response contract remains unknown. Missing queue data, transport/HTTP errors and zero LP must not be reinterpreted as verified unranked.                                                     |

These checks are explicit scope exceptions for the current pass, not outstanding
requests for the operator to perform. They are not marked passed. A later rank
feature must preserve unknown/unavailable rank state until its unranked contract
is supported by evidence; no guessed schema or synthetic fixture is promoted as
actual-client verification.

## Recorded measurement limits

- A reachable unidentified account was not exercised by this manual sign-out,
  which closes the client.
- Recorded visible app versions, privilege context and exact screen timing remain
  incomplete. The restart outcome is confirmed; credential rotation itself was
  not separately inspected or logged.

The agreed hands-on checks are complete with the explicit not-run exceptions
and measurement limits recorded above. See the
[verification summary](2026-11-04-verification-summary.md) for the combined
capture/manual results. This report updates local verification evidence; it
does not change runtime behavior or remote issue acceptance checkboxes.

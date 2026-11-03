# Issue tracker

Use GitHub Issues at `inferst/fluxta-league-of-legends` through `gh`.
Read an issue and its comments before implementation:
`gh issue view <number> --comments`.

Use full `owner/repo#number` references for other repositories. The v1 umbrella
is `fluxta/hub#21`; this repository owns the implementation tickets. Keep
automated evidence and actual-client evidence distinct in issue updates.
Use a temporary Markdown file and `--body-file` for multiline issue/PR bodies.

Triage labels: `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`. A missing host API capability belongs in an issue
here with `ready-for-human`; a person coordinates the upstream change. Adopt
the resulting published SDK/CLI release before resuming dependent work.

An implementation with outstanding Windows checks stays open. Link the runbook,
record tested versions and attach reviewed, sanitized representative captures
before claiming acquisition verified. Never attach raw credentials or raw
process output.

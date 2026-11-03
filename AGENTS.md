# League of Legends plugin

This repository is a self-contained Fluxta Plugin Source Package. Read
`CONTEXT.md` for domain language, `README.md` for commands and public Sources,
and `docs/acquisition/windows-runbook.md` for the real-client verification.
Issues live at `inferst/fluxta-league-of-legends`; see
`docs/agents/issue-tracker.md`.

- Keep client discovery, local HTTP, account interpretation and acquisition
  observations in the observation capability under `src/observation/`.
  Substitute external process discovery, HTTP and time in behavior tests;
  exercise the real capability through registered public Sources and External
  Connections. Do not mock the acquisition decisions.
- Local credentials belong only to local I/O. Never log process command lines,
  authentication headers, raw errors or unfiltered API responses. Never persist
  credentials. The capture command uses the same observation path and an explicit
  field allowlist; keep it safe for sharing.
- A missing game is normal. Client reachability, account identification and game
  availability are different facts. Clear current identity after failures or
  account changes; never use a previous account as the active one.
- Fluxta owns the Plugin API contract. Use the published `@fluxta/sdk` and
  `@fluxta/cli` through the catalog in `pnpm-workspace.yaml`. The installed SDK
  typings are authoritative. Do not patch the host or `node_modules` to bypass
  a contract gap: record it in this repo's issue and label `ready-for-human`.
- Runtime dependencies must be bundled into `dist/lol/`; Node builtins may stay
  external. Build with `pnpm build`. Run `pnpm check` before handing work over.
- Windows is the only supported runtime platform. Tests on other systems do not
  establish real Windows support. Keep synthetic fixtures clearly marked and
  actual-client evidence pending until the runbook has been executed.
- Do not expand this slice into rank persistence or full match behavior; those
  are separate tickets in `fluxta/hub#21`.
- Use Conventional Commits without a scope. Branches, commits and draft PRs are
  allowed. Merging, pushing to the default branch, force-pushing, publishing,
  deleting branches, and creating/deleting tags or releases require the user's
  explicit instruction in the conversation.

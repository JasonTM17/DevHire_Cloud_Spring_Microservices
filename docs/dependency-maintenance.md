# Dependency Maintenance Policy

DevHire Cloud keeps Dependabot enabled because dependency hygiene is part of the portfolio signal. The repository intentionally avoids merging every update immediately; updates are triaged by risk and release impact.

## Triage Groups

| Group | Default Action | Rationale |
|---|---|---|
| GitHub Actions patch/minor | Accept after green CI | Usually low-risk and improves security/tooling. |
| Docker base images patch/minor | Batch by runtime family | Keeps image drift small without forcing many tiny releases. |
| Maven patch/minor | Accept when tests and smoke gates pass | Backend dependency changes can affect contracts and runtime behavior. |
| npm patch/minor | Accept with typecheck, build, and Playwright smoke | Frontend runtime changes are visible and should be screenshot-checked. |
| Terraform provider major | Defer until migration review | AWS provider major upgrades can change resources and state behavior. |
| Node major | Defer until Docker/frontend compatibility review | Runtime major upgrades can affect Next.js build and image behavior. |
| Spring platform major | Defer until compatibility matrix review | Spring Boot/Spring Cloud compatibility is a hard production constraint. |

## Current v0.6 Release-Readiness State

The 2026-05-13 live GitHub scan reports 20 open Dependabot pull requests. `scripts/dependabot-zero-noise.ps1 -DryRun` classifies the current queue as blocked, manual-review, or close/defer candidates; no PR is currently a clean safe merge candidate.

Do not claim a zero Dependabot queue until the owner-token apply path has been run and verified. The intended cleanup command is:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\dependabot-zero-noise.ps1 -Apply
Remove-Item Env:\GITHUB_TOKEN
```

Run this only after the release branch has green CI and runtime smoke evidence.

## v0.4 Strategy Background

- Use curated batches instead of merging all open PRs at once.
- Prioritize GitHub Actions and Docker patch/minor updates.
- Keep risky major upgrades documented until a dedicated migration phase.
- Do not merge dependency PRs without green CI, Docker, Security, and Docs workflows.
- Record the inventory under `reports/dependabot/` as generated evidence; reports are intentionally not committed.
- Current triage evidence lives in `docs/dependency-triage-v0.4.md`.
- Cleanup and label/comment automation lives in `docs/dependabot-cleanup-v0.4.md` and `scripts/dependabot-curate.ps1`.

## Local Inventory

```powershell
.\scripts\dependabot-inventory.ps1
```

The script reads open pull requests through the public GitHub API by default. If rate limits are hit, set `GITHUB_TOKEN` in the current shell. The token is never printed.

## Local Curation Dry Run

```powershell
.\scripts\dependabot-curate.ps1 -DryRun
```

The curation script never merges pull requests. With an owner token it can apply labels/comments, and deferred-major PR closure requires the explicit `-CloseDeferred` switch.

## Acceptance Criteria For Merging A Batch

- The batch is small enough to revert.
- Release notes or PR description explain risk level.
- `mvn -T1 clean verify` passes for Maven/backend-impacting changes.
- `npm run typecheck && npm run build && npm run e2e` passes for frontend-impacting changes.
- Docker matrix and Security workflows pass for image/tooling changes.
- Terraform updates pass `.\scripts\terraform-validate.ps1` and remain `validate` only.

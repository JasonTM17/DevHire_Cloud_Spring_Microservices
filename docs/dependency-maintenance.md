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

## Current v0.4 Strategy

- Use curated batches instead of merging all open PRs at once.
- Prioritize GitHub Actions and Docker patch/minor updates.
- Keep risky major upgrades documented until a dedicated migration phase.
- Do not merge dependency PRs without green CI, Docker, Security, and Docs workflows.
- Record the inventory under `reports/dependabot/` as generated evidence; reports are intentionally not committed.
- Current triage evidence lives in `docs/dependency-triage-v0.4.md`.

## Local Inventory

```powershell
.\scripts\dependabot-inventory.ps1
```

The script reads open pull requests through the public GitHub API by default. If rate limits are hit, set `GITHUB_TOKEN` in the current shell. The token is never printed.

## Acceptance Criteria For Merging A Batch

- The batch is small enough to revert.
- Release notes or PR description explain risk level.
- `mvn -T1 clean verify` passes for Maven/backend-impacting changes.
- `npm run typecheck && npm run build && npm run e2e` passes for frontend-impacting changes.
- Docker matrix and Security workflows pass for image/tooling changes.
- Terraform updates pass `.\scripts\terraform-validate.ps1` and remain `validate` only.

# Dependency Maintenance Policy

DevHire Cloud keeps Dependabot enabled because dependency hygiene is part of the portfolio signal. The repository intentionally avoids merging every update immediately; updates are triaged by risk and release impact.

## Triage Groups

| Group | Default Action | Rationale |
|---|---|---|
| GitHub Actions patch/minor | Accept after green CI | Usually low-risk and improves security/tooling. |
| Docker base images patch/minor | Batch by runtime family | Keeps image drift small without forcing many tiny releases. |
| Maven patch/minor | Accept when tests and smoke gates pass | Backend dependency changes can affect contracts and runtime behavior. |
| npm patch/minor | Accept with typecheck, build, and Playwright smoke | Frontend runtime changes are visible and should be screenshot-checked. |
| TypeScript major | Defer until the Next.js production build and compiler API are compatible | A standalone `tsc` pass is insufficient when the framework also loads the TypeScript compiler API. |
| Terraform provider major | Defer until migration review | AWS provider major upgrades can change resources and state behavior. |
| Node major | Defer until Docker/frontend compatibility review | Runtime major upgrades can affect Next.js build and image behavior. |
| Spring platform major | Defer until compatibility matrix review | Spring Boot/Spring Cloud compatibility is a hard production constraint. |

## 2026-07-15 Coordinated Integration Batch

This maintenance window consolidates 23 remote branches into one reviewable change: 1 README correction and 22 Dependabot updates spanning GitHub Actions, Docker images, Maven, npm, and Terraform. Major platform changes were reviewed together because Spring Boot 4, Testcontainers 2, Node 26, and the AWS provider 6 line require compatibility fixes beyond a mechanical version bump.

Local validation covered the full 12-module Maven reactor, 417 frontend tests, 22 property tests at 500 runs each, 52 Playwright scenarios across desktop and Pixel 7 projects, all three Terraform environments, documentation and repository audits, and an npm audit with zero known vulnerabilities. TypeScript remains on 6.0.3 because the current Next.js production build does not yet load the TypeScript 7 compiler API correctly; Dependabot ignores that major line until the framework boundary is compatible. Pull-request CI remains the final gate for the complete Docker matrix, CodeQL, secret scanning, SBOM generation, and filesystem scanning.

## 2026-05 Release-Readiness Baseline

The 2026-05-14 live GitHub scan originally found 20 Dependabot pull requests: 9 Docker, 1 GitHub Actions, 2 Maven, 4 npm/frontend, 3 Terraform, and 1 other. `scripts/dependabot-zero-noise.ps1 -Apply` was then run from an owner-authenticated shell. It found 0 clean merge candidates, commented on each PR, closed/deferred all 20 stale/behind/risky updates, and the remote Dependabot branches were pruned. No dependency PR was force-merged into the release.

Future dependency cleanup should start with a dry run:

```powershell
.\scripts\dependabot-zero-noise.ps1 -DryRun
```

Apply mode should run only during an explicit dependency maintenance window, after green CI/runtime smoke. The 2026-05-14 close-out covered local `ai-eval.ps1`, `api-smoke.ps1`, `runtime-observability-smoke.ps1`, `code-assessment-smoke.ps1`, and `perf-suite.ps1 -Vus 2 -Duration 10s -UseDocker` against Docker Gateway `18080`, then re-dispatched `AI Assistant Evaluation` and `Performance Smoke` on `master` until both were green.

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

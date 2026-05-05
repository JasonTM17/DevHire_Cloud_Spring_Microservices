# Repository Health Dashboard

This page summarizes the public GitHub presentation state for DevHire Cloud. It exists because a production portfolio should make repository health visible instead of asking reviewers to infer it from scattered files.

## Snapshot

Latest v0.4.6 health scan focus:

| Area | Status |
|---|---|
| Repository visibility | Public |
| Latest release | `v0.3.0` is visible |
| About description | Applied and verified with owner-authenticated GitHub API |
| Homepage | Applied and verified with owner-authenticated GitHub API |
| Topics | 20 topics applied and verified with owner-authenticated GitHub API |
| Default branch | `master` |
| Branch protection | Applied; public branch API reports `master protected=true`; `/protection` detail is public-limited without an owner token |
| Dependabot PRs | Zero-noise automation is available; remaining safe/manual PRs are merged only when clean and green, otherwise closed with comments |
| Runtime evidence | `docs/runtime-evidence-v0.4.md` |
| E2E posture | `cd frontend && npm run e2e:all` is self-starting; desktop + mobile smoke passed locally |

v0.4.6 verification result: owner-authenticated GitHub API confirmed the repository description, homepage, 20 topics, and `master protected=true`. Deferred-major Dependabot PRs were closed through the curation script. v0.4.7 adds a zero-noise pass for the remaining PR queue and treats public-limited protection detail reads as informational when the public branch endpoint confirms protection.

Commands executed for this snapshot:

```powershell
.\scripts\github-governance.ps1 -DryRun
.\scripts\repository-health.ps1
.\scripts\github-facade-assert.ps1 -AllowOwnerActions
.\scripts\public-portfolio-audit.ps1
```

## Generate A Fresh Report

```powershell
.\scripts\repository-health.ps1
```

The script reads GitHub API data. If unauthenticated GitHub API calls are rate-limited or blocked, set `GITHUB_TOKEN` from an owner shell for authoritative facade and branch-protection verification.

Generated reports are written under `reports/repository-health/` and are ignored.

## What The Script Checks

- public metadata: description, homepage, topics, default branch, visibility,
- latest public release,
- branch protection summary and detailed protection readability,
- latest workflow runs on `master`,
- open Dependabot PR count by category,
- local evidence documents for release, runtime, governance, security, and cloud readiness.

## Root Facade And Artifact Policy

The root should show engineering intent, not local tool output:

- `.stitch/` was removed from tracked files; the UI design source now lives in [design-system.md](design-system.md).
- [Repository structure](repository-structure.md) explains every top-level folder that remains.
- `scripts/clean-local-artifacts.ps1` cleans ignored generated artifacts while keeping `.env` and `frontend/node_modules` unless explicitly requested.
- `scripts/repo-hygiene.ps1` verifies no forbidden runtime, secret, report, or crash artifacts are tracked.

## Owner Actions

If the script reports missing public metadata or unprotected `master` after future repository changes, run:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\github-governance.ps1 -Apply -MetadataOnly
.\scripts\github-governance.ps1 -Apply -BranchProtectionOnly
Remove-Item Env:\GITHUB_TOKEN
```

If the token lacks repository administration permission, apply branch protection manually with [branch protection](branch-protection.md).

Alternative audited route:

- add repository secret `REPO_GOVERNANCE_TOKEN`,
- run `Actions -> Repository Governance -> mode=dry-run`,
- run `mode=apply-metadata` after reviewing the artifact,
- run `mode=apply-branch-protection` after confirming the required checks are green.
- run `mode=verify-only` to prove About/Homepage/Topics and `master protected=true` are visible after apply.

Alternative declarative route:

- install the GitHub Settings app,
- review [`.github/settings.yml`](../.github/settings.yml),
- let the app reconcile About/Homepage/Topics, branch protection, merge strategy, vulnerability alerts, and maintenance labels,
- rerun `.\scripts\repository-health.ps1`.

## E2E Evidence Posture

`E2E Smoke` now has two lanes:

- `Frontend Preview Smoke` runs on pull requests without Docker. It builds the Next.js app, starts it locally, exercises Playwright desktop/mobile smoke through deterministic preview fallbacks, and verifies API compatibility in manifest mode.
- `Docker Compose Browser Smoke` remains manual/scheduled because it starts the full stack and is intentionally heavier.

The public branch protection target should use stable required contexts first; the heavy Docker E2E lane stays evidence-oriented until it is consistently green in the hosted environment.

For local reviewer proof without Docker:

```powershell
cd frontend
npm run e2e:all
```

## Related Evidence

- [GitHub governance](github-governance.md)
- [GitHub owner actions](github-owner-actions.md)
- [Dependabot cleanup v0.4](dependabot-cleanup-v0.4.md)
- [Runtime evidence v0.4](runtime-evidence-v0.4.md)
- [Security evidence](security-evidence.md)

# Repository Health Dashboard

This page summarizes the public GitHub presentation state for DevHire Cloud. It exists because a production portfolio should make repository health visible instead of asking reviewers to infer it from scattered files.

## Snapshot

Latest v0.4.3 health scan focus:

| Area | Status |
|---|---|
| Repository visibility | Public |
| Latest release | `v0.3.0` is visible |
| About description | Empty on public GitHub API; owner apply still required |
| Homepage | Empty on public GitHub API; owner apply still required |
| Topics | Empty on public GitHub API; owner apply still required |
| Default branch | `master` |
| Branch protection | Public branch API reports `master protected=false`; owner apply still required |
| Dependabot PRs | 20 open PRs; curated through `scripts/dependabot-curate.ps1` |
| Runtime evidence | `docs/runtime-evidence-v0.4.md` |

v0.4.3 verification result: `GITHUB_TOKEN` was not set locally, so owner-only remote updates were skipped by design. Public API still reports empty About/Homepage/Topics and `master protected=false`; release `v0.3.0` remains visible.

Commands executed for this snapshot:

```powershell
.\scripts\github-governance.ps1 -DryRun
.\scripts\repository-health.ps1
```

## Generate A Fresh Report

```powershell
.\scripts\repository-health.ps1
```

The script reads public GitHub API data without a token. If `GITHUB_TOKEN` is present, it can also read detailed branch protection state when the token has permission.

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

If the script reports missing public metadata or unprotected `master`, run:

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

## Related Evidence

- [GitHub governance](github-governance.md)
- [GitHub owner actions](github-owner-actions.md)
- [Dependabot cleanup v0.4](dependabot-cleanup-v0.4.md)
- [Runtime evidence v0.4](runtime-evidence-v0.4.md)
- [Security evidence](security-evidence.md)

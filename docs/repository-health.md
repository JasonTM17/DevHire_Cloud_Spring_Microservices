# Repository Health Dashboard

This page summarizes the public GitHub presentation state for DevHire Cloud.

## Snapshot

| Area | Status |
|---|---|
| Repository visibility | Public |
| Latest release | `v0.5.1` is visible |
| About description | Applied |
| Homepage | Points to the `v0.5.1` release |
| Topics | 20 production-engineering topics |
| Default branch | `master` |
| Branch protection | Enabled; public branch API reports `protected=true` |
| Dependabot PRs | 20 open Dependabot PRs at the 2026-05-13 live scan; all require owner-token zero-noise cleanup or a scheduled dependency refresh |
| Runtime evidence | Domain metrics, runtime smoke, and portfolio runtime report scripts |
| Cloud posture | AWS blueprint apply-ready as code; no AWS apply claimed |
| Tracked source hygiene | Clean; reports, targets, `.next`, Playwright output, and local `.env` remain ignored |

Generate a fresh report:

```powershell
.\scripts\repository-health.ps1
```

Generated reports are written under `reports/repository-health/` and are ignored.

## What The Script Checks

- public metadata: description, homepage, topics, default branch, visibility,
- latest public release,
- branch protection summary and detailed protection readability when an owner token is available,
- latest workflow runs on `master`,
- open Dependabot PR count by category,
- local evidence documents for release, runtime, governance, security, and cloud readiness.

## Root Facade And Artifact Policy

- [Repository structure](repository-structure.md) explains every top-level folder.
- `scripts/clean-local-artifacts.ps1` cleans ignored generated artifacts while preserving `.env` unless explicitly requested.
- `scripts/repo-hygiene.ps1` verifies no forbidden runtime, secret, report, or crash artifacts are tracked.

Fresh reviewer cleanup:

```powershell
.\scripts\clean-local-artifacts.ps1 -DryRun
.\scripts\clean-local-artifacts.ps1 -Apply
```

## Related Evidence

- [status](status.md)
- [GitHub governance](github-governance.md)
- [Branch protection](branch-protection.md)
- [Security evidence](security-evidence.md)
- [Cloud readiness review](cloud-readiness-review.md)
- [Production scorecard](production-engineering-scorecard.md)

# GitHub Governance

DevHire Cloud treats GitHub repository presentation as part of the production portfolio surface.

## Current State

| Signal | Status |
|---|---|
| About description | Applied |
| Homepage | Points to `v0.5.1` |
| Topics | 20 topics applied |
| Latest release | `v0.5.1` public |
| Default branch | `master` |
| Branch protection | Enabled |
| Dependabot queue | 20 open Dependabot PRs at the 2026-05-14 live scan; curation dry-run: 11 safe-batch, 3 manual-review, 6 defer-major; zero-noise: 0 clean merge candidates |
| Wiki | Disabled target; the repository should not expose an empty Wiki tab |
| Merge policy | Squash or rebase only; merge commits disabled in settings-as-code |
| Branch cleanup | Delete merged branches enabled in settings-as-code |

## Verification

```powershell
.\scripts\github-governance.ps1 -DryRun
.\scripts\github-facade-assert.ps1
.\scripts\repository-health.ps1
.\scripts\pr-stack-status.ps1
.\scripts\dependabot-zero-noise.ps1 -DryRun
```

## Apply Path

Owner-token shell:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\github-governance.ps1 -Apply -MetadataOnly
.\scripts\github-governance.ps1 -Apply -BranchProtectionOnly
Remove-Item Env:\GITHUB_TOKEN
```

GitHub Actions path:

1. Add `REPO_GOVERNANCE_TOKEN`.
2. Run `Repository Governance / dry-run`.
3. Run `apply-metadata`.
4. Run `apply-branch-protection`.
5. Run `verify-only`.

## Target Homepage

```text
https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.5.1
```

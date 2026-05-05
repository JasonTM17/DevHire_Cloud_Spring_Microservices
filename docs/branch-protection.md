# Branch Protection

DevHire Cloud uses `master` as the public portfolio branch. It should be protected because recruiters and reviewers treat the default branch as the production-quality evidence line.

## Target Rules

Recommended protection for `master`:

| Rule | Target |
|---|---|
| Require pull request before merge | Enabled |
| Required approving reviews | 1 |
| Code Owners review | Enabled |
| Dismiss stale approvals | Enabled |
| Require conversation resolution | Enabled |
| Require branches up to date before merge | Enabled through strict status checks |
| Apply rules to administrators | Enabled |
| Force pushes | Blocked |
| Branch deletion | Blocked |

Required checks use the exact job contexts GitHub exposes to branch protection:

- `Maven Verify`
- `Portfolio docs quality`
- `Gitleaks Secret Scan`
- `Trivy Filesystem Scan`
- `Generate SBOM`
- `Maven Dependency Tree`
- `Build api-gateway`
- `Build frontend`
- `Analyze java-kotlin`
- `Analyze javascript-typescript`

AI, full Docker E2E, performance, and runtime smoke workflows are intentionally not required checks because they can be heavy, scheduled, or manually triggered. They remain portfolio evidence gates.

## Automation

Preview the target:

```powershell
.\scripts\github-governance.ps1 -DryRun
```

Apply protection from an owner shell:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\github-check-contexts.ps1
.\scripts\github-governance.ps1 -Apply -BranchProtectionOnly
Remove-Item Env:\GITHUB_TOKEN
```

The token needs repository administration permission. Apply GitHub About/Homepage/Topics separately with `.\scripts\github-governance.ps1 -Apply -MetadataOnly`; that keeps the visible repository sidebar fix independent from the branch-protection rollout.

## GitHub UI Fallback

Open:

```text
Settings -> Branches -> Branch protection rules -> Add branch ruleset
```

Set:

- Branch name pattern: `master`
- Require a pull request before merging
- Require approvals: `1`
- Require review from Code Owners
- Dismiss stale pull request approvals when new commits are pushed
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Do not allow administrators to bypass the rules
- Add required checks: `Maven Verify`, `Portfolio docs quality`, `Gitleaks Secret Scan`, `Trivy Filesystem Scan`, `Generate SBOM`, `Maven Dependency Tree`, `Build api-gateway`, `Build frontend`, `Analyze java-kotlin`, `Analyze javascript-typescript`
- Require conversation resolution before merging
- Block force pushes
- Block deletions

## Verification

Public unauthenticated API calls can show whether `master` is protected, but the full branch protection document usually requires an authenticated owner token. The governance script records both:

- `branchProtected`: public branch summary flag
- `branchProtectionReadable`: detailed protection endpoint result

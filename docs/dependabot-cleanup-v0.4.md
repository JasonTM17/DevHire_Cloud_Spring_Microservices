# Dependabot Cleanup Playbook v0.4

DevHire Cloud keeps Dependabot PRs visible, triaged, and intentionally batched. The goal is to avoid a noisy public repo while still showing that dependency maintenance is owned.

## Current Issue

The public GitHub repo has around 20 open Dependabot PRs across Docker, GitHub Actions, Maven, npm/frontend, and Terraform. That number looks unmanaged unless it is backed by a clear curation policy.

## Automation

Preview the curation plan:

```powershell
.\scripts\dependabot-curate.ps1 -DryRun
```

Apply labels and curation comments from an owner shell:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\dependabot-curate.ps1 -Apply
Remove-Item Env:\GITHUB_TOKEN
```

Label only safe-batch PRs when you want a conservative first pass:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\dependabot-curate.ps1 -Apply -SafeOnly
Remove-Item Env:\GITHUB_TOKEN
```

Close deferred major PRs only when the owner intentionally chooses that behavior:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\dependabot-curate.ps1 -Apply -CloseDeferred
Remove-Item Env:\GITHUB_TOKEN
```

Delete the closed Dependabot branches only when the owner intentionally wants to reduce branch noise too:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\dependabot-curate.ps1 -Apply -CloseDeferred -DeleteClosedBranches
Remove-Item Env:\GITHUB_TOKEN
```

The script never merges pull requests automatically.

## GitHub Actions Route

Use `Actions -> Dependabot Curation` after adding the `REPO_GOVERNANCE_TOKEN` repository secret:

| Mode | Behavior |
|---|---|
| `dry-run` | Uploads a sanitized preview report; no PRs are changed |
| `label-safe` | Labels and comments only safe-batch PRs |
| `close-deferred` | Labels/comments all current Dependabot PRs and closes deferred-major PRs with a migration rationale |

`close-deferred` is the intended v0.4.6 public-noise burn-down step. It keeps safe maintenance PRs visible while closing risky majors that require dedicated runtime migration work.

## Labels

| Label | Meaning |
|---|---|
| `safe-batch` | Low-risk update that can be reviewed with a curated batch after CI passes |
| `deferred-major` | Major/runtime/platform update deferred to a dedicated migration pass |
| `needs-runtime-smoke` | Needs Docker/runtime smoke before merge |
| `portfolio-maintenance` | Maintenance work that affects public portfolio quality |

## Batch Policy

| Batch | Default Action | Required Verification |
|---|---|---|
| GitHub Actions patch/minor | Keep, label `safe-batch` | actionlint, docs/security workflows |
| Docker base images | Keep, label `safe-batch`, `needs-runtime-smoke` | Docker build matrix, API smoke |
| Playwright tooling | Keep, label `safe-batch`, `needs-runtime-smoke` | frontend build, Playwright smoke |
| Maven compatibility updates | Manual review | `mvn -T1 clean verify`, runtime smoke |
| Terraform AWS provider 6.x | Defer | migration review, Terraform validate |
| Node 25 / runtime majors | Defer | dedicated runtime migration |
| Spring/JJWT/Testcontainers/Springdoc majors | Defer | dedicated platform migration |

## Noise Reduction Defaults

`.github/dependabot.yml` now limits new PR fan-out:

- Maven and npm are capped at 4 open PRs each.
- GitHub Actions is capped at 2 open PRs.
- Terraform environment providers are capped at 1 open PR per environment and labeled as deferred-major candidates.
- Docker base-image updates are capped at 1 open PR per service and labeled for safe batch plus runtime smoke.

This does not hide dependency risk. It makes the public backlog reviewable and prevents Dependabot from recreating an unmanaged-looking wall of branches after cleanup.

## Reviewer Signal

Open Dependabot PRs are not ignored. They are categorized as portfolio maintenance work and either:

- grouped into safe batches,
- held for runtime smoke,
- or deferred as major migration work.

Generated reports are written under `reports/dependabot-curate/` and are intentionally ignored.

## Expected v0.4.6 Result

Current dry-run evidence categorizes the public Dependabot queue as:

| Category | Count | Expected Owner Action |
|---|---:|---|
| Safe batch | 11 | Keep open, label, require CI plus runtime smoke before merge |
| Deferred major | 8 | Close with comment explaining dedicated migration/runtime-smoke requirement |
| Manual review | 1 | Keep open until scoped review |

After `Dependabot Curation -> close-deferred`, the visible PR count should drop while the remaining PRs show intentional maintenance labels.

# GitHub Governance Automation

DevHire Cloud keeps repository presentation as a first-class portfolio artifact. The backend/runtime stack already has strong evidence; this document covers the public GitHub surface that a recruiter sees before opening any source file.

## Current Public State

The owner-authenticated GitHub API snapshot taken during the v0.4.7 governance pass showed:

| Area | Status |
|---|---|
| Repository visibility | Public |
| About description | Applied |
| Homepage | Applied |
| Topics | 20 topics applied |
| Latest release | `v0.3.0` public |
| Default branch | `master` |
| Branch protection | Public branch API reports `master protected=true` |
| Dependabot PRs | 12 before the zero-noise pass, tracked by the curated Dependabot cleanup playbook |

The repository content includes automation and exact owner fallback steps. If a short-lived owner token is available, the GitHub metadata and branch protection can be re-applied from the local shell without pasting the token into chat or committing it.

Latest local verification:

```powershell
.\scripts\github-governance.ps1 -DryRun
.\scripts\repository-health.ps1
```

Without a token, local verification uses public API signals and records branch protection detail reads as `public-limited`. Owner-only GitHub settings must still be mutated through a short-lived owner token or the audited `Repository Governance` workflow using `REPO_GOVERNANCE_TOKEN`.

## Automation

Preview the target state:

```powershell
.\scripts\github-governance.ps1 -DryRun
```

Apply the visible GitHub About sidebar first:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\github-governance.ps1 -Apply -MetadataOnly
Remove-Item Env:\GITHUB_TOKEN
```

Audit the required check contexts before applying branch protection:

```powershell
.\scripts\github-check-contexts.ps1
```

Apply branch protection separately after the visible metadata is fixed and the context audit is green:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\github-governance.ps1 -Apply -BranchProtectionOnly
Remove-Item Env:\GITHUB_TOKEN
```

The script writes sanitized JSON and Markdown reports under `reports/github-governance/`. That directory is ignored because it is generated evidence.

## GitHub Actions Route

If local Browser automation or local tokens are unavailable, use the audited workflow route:

1. Create a repository secret named `REPO_GOVERNANCE_TOKEN`.
2. The token must have repository administration permission for `JasonTM17/DevHire_Cloud_Spring_Microservices`.
3. Open `Actions -> Repository Governance`.
4. Run with `mode=dry-run` first.
5. Run with `mode=apply-metadata` to update the About description, homepage, and topics that appear in the right sidebar.
6. Run with `mode=apply-branch-protection` after the main workflows are green and you are ready to protect `master`; the workflow runs `scripts/github-check-contexts.ps1` first.
7. Use `mode=apply-all` only when you want to update metadata and branch protection in one owner-approved run.

The workflow is defined in `.github/workflows/repository-governance.yml` and uploads sanitized governance reports as workflow artifacts. It does not print the token.

This is the recommended fallback when the in-app browser cannot control GitHub settings and `GITHUB_TOKEN` is not set locally.

## Settings As Code Route

The repo also includes [`.github/settings.yml`](../.github/settings.yml) for the [Probot Settings](https://github.com/probot/settings) app. This is a second owner-approved path when a PAT or workflow secret is not desirable.

The file defines:

- repository description, homepage, topics, merge strategy, and vulnerability alert posture,
- `master` branch protection with the same stable required check contexts used by `scripts/github-governance.ps1`,
- public maintenance labels for Dependabot triage and runtime-smoke review.

Owner flow:

1. Install the GitHub Settings app for this repository.
2. Review [`.github/settings.yml`](../.github/settings.yml) in the pull request or on `master`.
3. Let the app reconcile repository metadata and branch protection.
4. Run `.\scripts\repository-health.ps1` to confirm About/Homepage/Topics and `master protected=true`.

This route keeps the public facade declarative and reviewable, but it still requires owner installation/approval. It does not bypass GitHub administration permission.

## Target Repository Metadata

Description:

```text
Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.
```

Homepage:

```text
https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.3.0
```

Topics:

```text
java, spring-boot, microservices, spring-cloud, postgresql, kafka, opensearch, redis, docker, kubernetes, terraform, aws, prometheus, grafana, nextjs, anthropic, claude, rag, devops, portfolio
```

## Target Branch Protection

`scripts/github-governance.ps1 -Apply -BranchProtectionOnly` applies the default `master` branch protection payload when the token has administration permission:

- require pull requests before merge through protected-branch flow,
- require 1 approving review,
- require Code Owners review,
- dismiss stale approvals,
- require conversation resolution,
- require up-to-date required checks,
- enforce the same rules for administrators,
- block force pushes,
- block deletion.

Required checks use stable job contexts, not broad workflow names:

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

`scripts/github-check-contexts.ps1` reads recent successful GitHub Actions jobs and fails if any required context is missing before branch protection is applied.

## Token Safety

- The token is read only from `GITHUB_TOKEN` or `REPO_GOVERNANCE_TOKEN` in the current shell.
- The token is never printed, persisted, or written into generated reports.
- Generated reports store only sanitized status, target metadata, current public metadata, and owner action summaries.
- If no token is set, `-Apply` fails fast and `-DryRun` remains fully useful for evidence.

## Owner Action Status

The repo can be reviewed professionally before owner metadata is applied because the target values and automation are committed. The remaining public UI actions are tracked in:

- [GitHub owner actions](github-owner-actions.md)
- [Branch protection](branch-protection.md)
- [Repository health dashboard](repository-health.md)

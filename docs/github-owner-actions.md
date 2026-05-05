# GitHub Owner Actions

These actions require repository owner permissions and are intentionally not forced by CI. Use `scripts/github-governance.ps1 -DryRun` to preview the repository metadata, release, and branch-protection state.

Current verification on 2026-05-05:

- `scripts/github-governance.ps1 -DryRun` produces the metadata payload below and checks the public release/branch state.
- Owner-authenticated GitHub API reports repository metadata applied and `master protected=true`.
- Public facade assertion now treats `master protected=true` from the public branch endpoint as pass even when detailed `/protection` reads require owner permissions.
- GitHub API reported release `v0.4.6` is visible.
- The older `scripts/github-repo-polish.ps1` remains for compatibility; `scripts/github-governance.ps1` is now the preferred owner-facing automation.

## About Section

Description:

```text
Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.
```

Homepage:

```text
https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.4.6
```

Topics:

```text
java, spring-boot, microservices, spring-cloud, postgresql, kafka, opensearch, redis, docker, kubernetes, terraform, aws, prometheus, grafana, nextjs, anthropic, claude, rag, devops, portfolio
```

## Branch Protection

Protect `master` with:

- require pull request before merge,
- require Code Owners review,
- require status checks before merge,
- apply rules to administrators,
- block force pushes,
- block branch deletion,
- require conversation resolution.

Recommended required checks:

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

Run `.\scripts\github-check-contexts.ps1` before applying branch protection. The script validates these exact job contexts against recent successful workflow runs so GitHub branch protection does not get configured with broad workflow names that never complete.

## Dry-Run Publication Command

Preview the exact GitHub metadata payload and public governance status:

```powershell
.\scripts\github-governance.ps1 -DryRun
```

Apply the visible GitHub About sidebar first from an owner shell with a short-lived token:

```powershell
$env:GITHUB_TOKEN = "<owner-token>"
.\scripts\github-governance.ps1 -Apply -MetadataOnly
Remove-Item Env:\GITHUB_TOKEN
```

Then apply branch protection:

```powershell
$env:GITHUB_TOKEN = "<owner-token>"
.\scripts\github-check-contexts.ps1
.\scripts\github-governance.ps1 -Apply -BranchProtectionOnly
Remove-Item Env:\GITHUB_TOKEN
```

The script also accepts `REPO_GOVERNANCE_TOKEN` for local owner shells. If the token lacks repository administration permission, use the UI fallback in `docs/branch-protection.md`.

## GitHub Actions Apply Route

Use this route when local browser automation is unavailable or you do not want to keep an owner token in the local shell:

1. Create repository secret `REPO_GOVERNANCE_TOKEN` with repository administration permission.
2. Open `Actions -> Repository Governance`.
3. Run `mode=dry-run`.
4. Review the uploaded governance report artifact.
5. Run `mode=apply-metadata` to fix the GitHub About/Homepage/Topics sidebar; the workflow now fails if metadata is still empty after apply.
6. Run `mode=apply-branch-protection` after confirming the required checks are green; the workflow now runs `github-check-contexts.ps1` and fails if `master protected=true` is not visible after apply.
7. Run `mode=verify-only` to prove the public facade is applied without mutating settings.
8. Use `mode=apply-all` only when you intentionally want both operations in one run.

The workflow uses the same target metadata as the local script and uploads sanitized governance, facade assertion, check-context, and repository-health reports after every run.

Local owner-shell equivalent:

```powershell
$env:GITHUB_TOKEN = "<owner-token>"
.\scripts\github-governance.ps1 -Apply -MetadataOnly
.\scripts\github-facade-assert.ps1 -MetadataOnly
.\scripts\github-check-contexts.ps1
.\scripts\github-governance.ps1 -Apply -BranchProtectionOnly
.\scripts\github-facade-assert.ps1 -BranchProtectionOnly
Remove-Item Env:\GITHUB_TOKEN
```

## Settings-As-Code Apply Route

Use this route when you prefer a declarative repository policy instead of a local owner token or workflow secret:

1. Install the GitHub Settings app for this repository.
2. Review [`.github/settings.yml`](../.github/settings.yml).
3. Let the app reconcile repository description, homepage, topics, merge strategy, branch protection, vulnerability alerts, and maintenance labels.
4. Run `.\scripts\repository-health.ps1` to confirm the public facade changed.

This route is still owner-controlled. It makes the desired GitHub state reviewable in source control, but it cannot apply without repository administration permission.

## Latest Verification Output

The latest v0.4.7 target state is:

```text
description current : set
homepage current    : set
topics current      : 20
release v0.4.6      : visible
branch protected    : true
enforce admins      : true
dependabot PRs      : 0
```

The public facade cleanup is complete. Future dependency work should run through scheduled curated batches instead of leaving unmanaged Dependabot noise on the repository front page.

## API Verification Snapshot

The expected repository metadata payload is:

```json
{
  "description": "Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.",
  "homepage": "https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.4.6",
  "has_issues": true,
  "has_projects": true,
  "has_wiki": true
}
```

The expected topics payload is:

```json
{
  "names": [
    "java",
    "spring-boot",
    "microservices",
    "spring-cloud",
    "postgresql",
    "kafka",
    "opensearch",
    "redis",
    "docker",
    "kubernetes",
    "terraform",
    "aws",
    "prometheus",
    "grafana",
    "nextjs",
    "anthropic",
    "claude",
    "rag",
    "devops",
    "portfolio"
  ]
}
```

## Releases And Packages

- Keep `v0.4.6` visible as the current production portfolio release.
- Keep GHCR packages public if available for the account.
- Future releases should be created by pushing `vX.Y.Z` tags from a green `master` commit.
- Release notes should point to `docs/release-evidence/<version>.md`.

## Owner Checklist

- [x] Fill About description, homepage, and topics through owner-authenticated apply.
- [x] Audit required check contexts before branch protection.
- [x] Enable branch protection on `master`.
- [x] Verify facade state with owner-authenticated GitHub API.
- [ ] Add or keep repository secret `REPO_GOVERNANCE_TOKEN` if you want future browser-free governance workflow runs.
- [x] Confirm release `v0.4.6` is public.
- [ ] Confirm GHCR images are visible or document account limitation.

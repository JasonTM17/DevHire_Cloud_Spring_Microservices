# GitHub Owner Actions

These actions require repository owner permissions and are intentionally not forced by CI. Use `scripts/github-governance.ps1 -DryRun` to preview the repository metadata, release, and branch-protection state.

Current local verification on 2026-05-05:

- `scripts/github-governance.ps1 -DryRun` produced the metadata payload below and checked the public release/branch state.
- v0.4.3 verification also found `GITHUB_TOKEN` was not set in the local shell, so `-Apply` was intentionally skipped.
- GitHub API reported the repository is public, with empty About description, homepage, and topics. These remain owner actions until a short-lived owner token is available.
- Owner-authenticated GitHub API now reports repository metadata applied and `master protected=true`.
- GitHub API reported release `v0.3.0` is visible.
- The older `scripts/github-repo-polish.ps1` remains for compatibility; `scripts/github-governance.ps1` is now the preferred owner-facing automation.

## About Section

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

## Branch Protection

Protect `master` with:

- require pull request before merge,
- require Code Owners review,
- require status checks before merge,
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

The latest v0.4.5 local dry-run reported:

```text
description current : empty
homepage current    : empty
topics current      : 0
release v0.3.0      : visible
branch protected    : false
dependabot PRs      : 20
```

This means the source repository now contains audited automation plus `.github/settings.yml`, but the public GitHub facade still needs owner execution or GitHub Settings app reconciliation.

## API Verification Snapshot

The expected repository metadata payload is:

```json
{
  "description": "Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.",
  "homepage": "https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.3.0",
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

- Keep `v0.3.0` visible as the current production portfolio release.
- Keep GHCR packages public if available for the account.
- Future releases should be created by pushing `vX.Y.Z` tags from a green `master` commit.
- Release notes should point to `docs/release-evidence/<version>.md`.

## Owner Checklist

- [x] Fill About description, homepage, and topics through owner-authenticated apply.
- [x] Audit required check contexts before branch protection.
- [x] Enable branch protection on `master`.
- [x] Verify facade state with owner-authenticated GitHub API.
- [ ] Add repository secret `REPO_GOVERNANCE_TOKEN` later if you want future browser-free governance workflow runs.
- [x] Confirm release `v0.3.0` is public.
- [ ] Confirm GHCR images are visible or document account limitation.

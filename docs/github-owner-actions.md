# GitHub Owner Actions

These actions require repository owner permissions and are intentionally not forced by CI. Use `scripts/github-governance.ps1 -DryRun` to preview the repository metadata, release, and branch-protection state.

Current local verification on 2026-05-04:

- `scripts/github-governance.ps1 -DryRun` produced the metadata payload below and checked the public release/branch state.
- v0.4.2 verification also found `GITHUB_TOKEN` was not set in the local shell, so `-Apply` was intentionally skipped.
- GitHub API reported the repository is public, with empty About description, homepage, and topics. These remain owner actions until a short-lived owner token is available.
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

- `CI / Maven Verify`
- `Docker Images`
- `Security / Gitleaks Secret Scan`
- `Security / Trivy Filesystem Scan`
- `CodeQL / Analyze`
- `Documentation / Portfolio docs quality`
- `Terraform / Validate AWS Blueprint`

## Dry-Run Publication Command

Preview the exact GitHub metadata payload and public governance status:

```powershell
.\scripts\github-governance.ps1 -DryRun
```

Apply it only from an owner shell with a short-lived `GITHUB_TOKEN`:

```powershell
$env:GITHUB_TOKEN = "<owner-token>"
.\scripts\github-governance.ps1 -Apply
Remove-Item Env:\GITHUB_TOKEN
```

Branch protection is also included in `scripts/github-governance.ps1 -Apply`. If the token lacks repository administration permission, use the UI fallback in `docs/branch-protection.md`.

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

- [ ] Fill About description.
- [ ] Fill homepage.
- [ ] Add topics.
- [ ] Enable branch protection.
- [ ] Confirm release `v0.3.0` is public.
- [ ] Confirm GHCR images are visible or document account limitation.

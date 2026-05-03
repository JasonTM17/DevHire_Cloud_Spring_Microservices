# GitHub Owner Actions

These actions require repository owner permissions and are intentionally not forced by CI. Use `scripts/github-repo-polish.ps1 -DryRun` to preview the repository metadata payload.

## About Section

Description:

```text
Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.
```

Homepage:

```text
https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.2.0
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
- `Documentation / Portfolio docs quality`
- `Terraform / Validate AWS Blueprint`

## Releases And Packages

- Keep `v0.2.0` visible as the current production portfolio release.
- Keep GHCR packages public if available for the account.
- Future releases should be created by pushing `vX.Y.Z` tags from a green `master` commit.
- Release notes should point to `docs/release-evidence/<version>.md`.

## Owner Checklist

- [ ] Fill About description.
- [ ] Fill homepage.
- [ ] Add topics.
- [ ] Enable branch protection.
- [ ] Confirm release `v0.2.0` is public.
- [ ] Confirm GHCR images are visible or document account limitation.

# GitHub Repository Profile Checklist

Use this checklist to make the public GitHub repository look like a senior production engineering portfolio.

## Status Badges

Add these badges near the top of `README.md` after the repository is public and GitHub Actions are enabled:

```markdown
[![CI](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/ci.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/ci.yml)
[![Docker](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docker.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docker.yml)
[![Security](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/security.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/security.yml)
[![Terraform](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/terraform.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/terraform.yml)
[![Docs](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docs.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docs.yml)
```

## About

Owner action status: not applied from the local shell because `GITHUB_TOKEN` was not configured. The repository is public, but GitHub API currently reports empty About description, homepage, and topics. Preview or apply the target state with `scripts/github-governance.ps1`.

Description:

```text
Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.
```

Website:

```text
https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.4.6
```

Topics:

```text
java
spring-boot
microservices
spring-cloud
postgresql
kafka
opensearch
redis
docker
kubernetes
terraform
aws
prometheus
grafana
nextjs
anthropic
claude
rag
devops
portfolio
```

## Recommended Settings

- Protect `master`.
- Require pull request before merging.
- Require status checks:
  - `CI / Maven Verify`
  - `Docker Images`
  - `Security / Gitleaks Secret Scan`
  - `CodeQL / Analyze`
  - `Terraform / Validate AWS Blueprint`
  - `Docs / Documentation Quality`
  - `AI Evaluation / Claude Assistant Smoke`
- Disable force pushes.
- Enable Dependabot alerts.
- Enable secret scanning if available for the account.
- Add `CODEOWNERS` review requirement.
- Keep release `v0.3.0` visible as the current public portfolio release.

## Automation

Preview the full GitHub publication target:

```powershell
.\scripts\github-governance.ps1 -DryRun
```

Apply About/Homepage/Topics only from an owner shell:

```powershell
$env:GITHUB_TOKEN = "<owner-token>"
.\scripts\github-governance.ps1 -Apply
Remove-Item Env:\GITHUB_TOKEN
```

The same apply command attempts branch protection for `master` with the required checks documented in `docs/branch-protection.md`.

## Manual Release Flow

1. Open a release PR using the checklist in `docs/release-checklist-v0.2.md` plus the current release evidence file.
2. Attach sanitized screenshots or command summaries for Docker, smoke, performance, OpenAPI, Terraform, security, and docs gates.
3. Merge only after `docs/PROGRESS.md`, release notes, and release evidence match the actual verification.
4. Create an annotated `vX.Y.Z` tag from a green `master` commit and let `.github/workflows/release.yml` publish the release.

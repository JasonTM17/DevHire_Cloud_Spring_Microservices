# GitHub Repository Profile

Use this page to keep the public GitHub facade aligned with the current release.

## About

Description:

```text
Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.
```

Homepage:

```text
https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.6.0
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

## Verification

```powershell
.\scripts\github-governance.ps1 -DryRun
.\scripts\github-facade-assert.ps1
.\scripts\repository-health.ps1
```

## Required Settings

- Protect `master`.
- Require pull request before merging.
- Require status checks for Maven, Docker, Docs, Security, CodeQL, and Terraform.
- Disable force pushes.
- Enable Dependabot alerts and secret scanning when available.
- Keep `CODEOWNERS` review requirement enabled.

## Release Flow

1. Prepare release notes in `docs/release-notes/<tag>.md`.
2. Merge release changes through protected `master`.
3. Tag from a green `master` commit.
4. Let `.github/workflows/release.yml` publish images and create the release from the matching notes file.

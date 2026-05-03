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

Description:

```text
Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.
```

Website:

```text
https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices
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
  - `Terraform / Validate AWS Blueprint`
  - `Docs / Documentation Quality`
  - `AI Evaluation / Claude Assistant Smoke`
- Disable force pushes.
- Enable Dependabot alerts.
- Enable secret scanning if available for the account.
- Add `CODEOWNERS` review requirement.
- Create release `v0.2.0` after the operations-grade verification checklist passes.

## Manual Release Flow

1. Open a release PR using the checklist in `docs/release-checklist-v0.2.md`.
2. Attach sanitized screenshots or command summaries for Docker, smoke, performance, chaos, OpenAPI, Terraform, security, and docs gates.
3. Merge only after `docs/PROGRESS.md` and `docs/release-notes/v0.2.0.md` match the actual verification.
4. Create tag `v0.2.0` and paste the release notes summary.

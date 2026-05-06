# Production Engineering Scorecard

This scorecard gives reviewers a fast, evidence-backed view of DevHire Cloud as a production engineering portfolio. Scores are intentionally conservative: runtime and owner-permission gaps stay visible instead of being hidden behind aspirational language.

## Summary

| Category | Score | Evidence |
|---|---:|---|
| Architecture and service boundaries | 9/10 | Multi-module Spring Boot services, service-owned databases, Flyway migrations, gateway routing, no shared JPA entities, architecture tests |
| Security and identity | 8/10 | JWT access tokens, refresh rotation, logout blacklist, BCrypt, role checks, security headers, Gitleaks, blocking Trivy image scans, CodeQL |
| Reliability and event delivery | 8/10 | Kafka, transactional outbox, retry/dead-letter states, idempotent notification/audit consumers, chaos smoke scripts |
| Observability and SLOs | 8/10 | Actuator, Prometheus rules, Grafana SLO dashboard, Loki, Tempo, OpenTelemetry, runtime evidence docs |
| CI/CD and release governance | 8/10 | Maven verify, frontend build, ratcheted coverage gate, Docker matrix, docs/security/terraform workflows, release notes, release evidence |
| Cloud readiness | 9/10 | Docker Compose, Kubernetes manifests without `latest`, `ai-service` raw K8s coverage, Helm chart with immutable defaults, Argo CD samples, AWS Terraform blueprint, External Secrets wiring, race-safe Terraform validation, cloud policy audit |
| Runtime reviewer proof | 9/10 | Self-starting frontend E2E smoke, portfolio verification scripts, curated demo evidence pack, API smoke, AI eval, Mailpit smoke, OpenAPI verify, performance and chaos smoke wrappers |
| AI portfolio layer | 8/10 | Claude Haiku assistant, RAG citations, fallback mode, tool traces, AI safety docs, eval dataset |
| Public GitHub facade | 9.5/10 | About/Homepage/Topics and `master` branch protection are applied; facade assertion handles public-limited protection details correctly, and settings-as-code disables admin bypass |

Overall portfolio posture: **9.1/10 production engineering evidence**, with the main remaining gap being future real-cloud deployment evidence in an AWS account.

## Architecture

DevHire Cloud demonstrates a real microservice decomposition instead of a folder-only split. The project has independent modules for gateway, auth, users, companies, jobs, applications, notifications, audit, AI, and common contracts. Each business service owns its database and Flyway migrations. The common library contains DTOs, event contracts, errors, and security helpers, but not business entities.

Evidence:

- [Service catalog](service-catalog.md)
- [Architecture review index](architecture-review-index.md)
- `mvn -T1 clean verify`
- ArchUnit tests in service test suites

## Security

Security is present at the API edge, service layer, CI pipeline, and documentation layer. Secrets are environment driven and ignored by repository hygiene checks. The project uses BCrypt, JWT validation, refresh token rotation, role-based authorization, gateway security headers, dependency review, secret scanning, CodeQL, SBOM generation, and Trivy scanning.

Evidence:

- [Security evidence](security-evidence.md)
- [Security policy](../SECURITY.md)
- `.github/workflows/security.yml`
- `.github/workflows/codeql.yml`
- `.gitleaks.toml`

## Reliability

The event path uses Kafka and transactional outbox publishing so important business events are stored before they are published. Consumers track event ids for idempotency. Runtime scripts cover degraded OpenSearch, Kafka, AI provider, and SMTP scenarios. Backup and disaster recovery runbooks are present for PostgreSQL-owned databases.

Evidence:

- [Runtime reliability review](runtime-reliability-review.md)
- [Runtime acceptance matrix](runtime-acceptance-matrix.md)
- [Kafka and outbox incident runbook](runbooks/kafka-outbox-incident.md)
- [Database restore drill](runbooks/database-restore-drill.md)

## Observability

Services expose actuator health and metrics. The Docker stack includes Prometheus, Grafana, Loki, Tempo, and OpenTelemetry Collector. Alerts and dashboards focus on availability, latency, error rate, JVM pressure, outbox health, and AI assistant provider behavior.

Evidence:

- [SLO documentation](slo.md)
- `infra/prometheus/rules/devhire-alerts.yml`
- `infra/grafana/dashboards/devhire-slo-overview.json`
- [Runtime evidence v0.4](runtime-evidence-v0.4.md)

## Delivery

The release path includes Maven verification, frontend typecheck/build, Docker image matrix builds, security workflows, docs quality gates, Terraform validation, release notes, and evidence files. Dockerfiles now include OCI labels for source, revision, version, created timestamp, title, description, and license.

Evidence:

- `.github/workflows/ci.yml`
- `.github/workflows/docker.yml`
- `.github/workflows/release.yml`
- [Versioning](versioning.md)
- [Release evidence v0.4](release-evidence/v0.4.0.md)
- [v0.4.6 public credibility evidence](release-evidence/v0.4.6.md)

## Cloud Readiness

Cloud deployment is intentionally blueprint-safe. The repo contains Docker Compose for local runtime, Kubernetes raw manifests, Helm values for local/staging/prod/AWS, Argo CD samples, External Secrets wiring, and an AWS Terraform blueprint for EKS, RDS, Redis, MSK, OpenSearch, ECR, and Secrets Manager. v0.4.9 adds race-safe Terraform validation, stricter cloud policy auditing, explicit kubeconform CRD skip handling, AWS account bootstrap docs, and an apply runbook. No cloud apply or secret commit is required.

Evidence:

- [Cloud readiness review](cloud-readiness-review.md)
- [Cloud completion scorecard](cloud-completion-scorecard.md)
- [AWS account bootstrap](aws-account-bootstrap.md)
- [Cloud apply runbook](cloud-apply-runbook.md)
- [AWS Terraform docs](../deploy/terraform/aws/TERRAFORM_DOCS.md)
- `deploy/helm/devhire-cloud`
- `deploy/gitops`
- `scripts/cloud-verify.ps1`
- `scripts/cloud-policy-audit.ps1`
- `scripts/terraform-race-smoke.ps1`

## Runtime Proof

Runtime proof is script-first so reviewers can run evidence without reading every service. Pull requests get a lightweight frontend preview smoke that does not need Docker, while full runtime proof depends on Docker being available locally; when Docker is unavailable, the repo records the blocker honestly.

Evidence:

- `scripts/portfolio-verify.ps1`
- `scripts/portfolio-demo-evidence.ps1`
- `scripts/docs-parity.ps1`
- `cd frontend && npm run e2e:all`
- `scripts/public-portfolio-audit.ps1`
- `scripts/api-smoke.ps1`
- `scripts/ai-eval.ps1`
- `scripts/email-smoke.ps1`
- `scripts/openapi-verify.ps1`
- `scripts/perf-suite.ps1`
- `scripts/chaos-smoke.ps1`

## Remaining Owner Actions

These are not code gaps. They are account or release-operation follow-ups:

- confirm GHCR package visibility if public package browsing is part of the demo.
- deploy the AWS blueprint to a real staging account when cloud credentials and budget are available.

Evidence:

- [GitHub governance](github-governance.md)
- [Branch protection](branch-protection.md)
- [Repository health](repository-health.md)
- [v0.4.6 public credibility evidence](release-evidence/v0.4.6.md)
- [v0.5.0 reviewer-grade evidence baseline](release-evidence/v0.5.0.md)
- `scripts/github-governance.ps1 -DryRun`
- `scripts/github-facade-assert.ps1 -AllowOwnerActions`
- `scripts/professionalism-audit.ps1`

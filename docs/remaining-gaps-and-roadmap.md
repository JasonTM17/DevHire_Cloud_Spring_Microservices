# Remaining Gaps And Production Roadmap

This document is intentionally direct. DevHire Cloud is a production engineering portfolio, not a live SaaS system running customer traffic. The repository already demonstrates strong microservice architecture, cloud blueprinting, CI/CD, security, observability, runtime scripts, and reviewer evidence. The items below are the remaining gaps that would be required before treating it as a real production platform.

## Executive Summary

| Area | Current state | Production gap | Next action |
|---|---|---|---|
| Public GitHub facade | About, topics, releases, branch protection, and Dependabot cleanup are applied | PR #29 still needs one external approval before `master` can receive v0.5.1 evidence | Get one write-access review, merge through protected branch flow, then tag the next release |
| Cloud | AWS Terraform, Helm, raw Kubernetes, External Secrets, and Argo CD are blueprint-ready and validated | No real AWS account has been applied, no live DNS/TLS/ingress proof exists | Run the cloud apply runbook in a budget-controlled staging account |
| Runtime | Docker Compose, API smoke, E2E, Mailpit, OpenAPI, metrics, chaos, and migration scripts exist | Full runtime evidence is local and generated on demand, not hosted as a public demo | Publish sanitized runtime evidence for each release, optionally add a short demo video |
| Monitoring | Prometheus rules, Grafana dashboards, domain metrics, SLO docs, and runtime observability smoke exist | No long-running production traffic history, incident history, or real error budget burn data | Run a scheduled demo environment for several days and archive SLO snapshots |
| Data | Service-owned seed data includes 1,108 primary portfolio records | Dataset is synthetic and deterministic, not anonymized real business traffic | Add a generated data dictionary and realistic weekly data growth scenarios |
| Backend tests | Unit, controller, architecture, contract, Testcontainers, migration, and runtime scripts exist | Coverage is ratcheted but still uneven across modules | Keep raising low modules in small commits, especially auth, gateway, AI, and common contracts |
| Security | Gitleaks, Trivy, CodeQL, SBOM, dependency policy, secret policy, security docs, and image labels exist | No external penetration test, DAST run, SLSA attestation enforcement, or signed release verification gate | Add OWASP ZAP baseline, cosign keyless signing enforcement, and release provenance verification |
| Frontend | Recruiter demo flows, dashboards, assistant page, screenshots, and E2E smoke exist | It is a portfolio UI, not a full product with every edge case and product analytics path | Add analytics-free event tracking stubs, richer empty states, and role-specific acceptance tests |
| AI assistant | Claude Haiku integration, fallback mode, citations, eval scripts, tool traces, and metrics exist | No live provider smoke is required by CI, and no paid provider SLA is proven | Add optional manual provider smoke with strict secret handling and cost limits |
| Operations | Runbooks cover common incidents, backup/restore, degraded dependencies, and cloud apply | No real on-call rotation, restore drill against a live cloud database, or incident postmortem exists | Run a staged disaster recovery drill and attach sanitized evidence |

## What Is Not Missing

These items are already present and should be reviewed before assuming the repository is a simple demo:

- Java 21 and Spring Boot 3.5 multi-module backend.
- API Gateway, auth, user, company, job, application, notification, audit, AI, and common modules.
- Service-owned PostgreSQL migrations with Flyway.
- Kafka event flow, transactional outbox, retries, dead-letter posture, and idempotent consumers.
- OpenSearch search path with PostgreSQL fallback.
- JWT access tokens, refresh token rotation, Redis blacklist, RBAC, CORS, and rate limiting.
- Next.js frontend with recruiter-friendly job, candidate, employer, admin, and assistant surfaces.
- Docker Compose full local stack.
- Kubernetes, Helm, Argo CD, External Secrets, and AWS Terraform blueprint.
- Prometheus, Grafana, Loki, Tempo, OpenTelemetry, Mailpit, SLO docs, and alert rules.
- CI, Docker image matrix, security scanning, CodeQL, Terraform validation, E2E, docs quality, and evidence gates.
- Trilingual documentation in Vietnamese, English, and Japanese.

## Release Readiness Gate

Before the next public release tag, the project should meet these gates:

| Gate | Required command or action | Status |
|---|---|---|
| Protected branch review | One write-access reviewer approves PR #29 | Pending external reviewer |
| CI | `.\scripts\github-workflow-status.ps1 -Branch v0.4.9-cloud-completion -RequireGreen` | Green on latest pushed commit |
| Backend | `mvn -T1 clean verify` | Passed during v0.5.1 work |
| Coverage | `.\scripts\check-coverage.ps1` | Passed |
| Frontend | `cd frontend && npm run typecheck && npm run build && npm run e2e:all` | Passed during v0.5.1 work |
| Docs | `.\scripts\docs-quality.ps1` and `.\scripts\docs-parity.ps1` | Passed |
| Evidence | `.\scripts\evidence-manifest-verify.ps1` and `.\scripts\evidence-audit.ps1` | Passed |
| Cloud | `.\scripts\cloud-verify.ps1`, `.\scripts\cloud-policy-audit.ps1`, `.\scripts\terraform-race-smoke.ps1` | Passed during cloud completion work |
| Runtime | `.\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl http://localhost:8080` | Run when Docker stack is available |

## Roadmap To A Real Staging Deployment

### Stage 1 - Release v0.5.1 through governance

Objective: land the current production-depth evidence without weakening branch protection.

Tasks:

- Get one approval from a reviewer with write access.
- Merge PR #29 into `master` through the protected branch flow.
- Confirm required GitHub Actions are green on `master`.
- Tag `v0.5.1` only after the merge.
- Update release evidence from "staged on PR" to "released".

### Stage 2 - Hosted runtime evidence

Objective: make runtime proof visible without requiring every recruiter to run Docker.

Tasks:

- Start the Docker stack locally or on a controlled demo runner.
- Run `portfolio-demo-evidence.ps1`, `portfolio-runtime-report.ps1`, and `runtime-observability-smoke.ps1`.
- Promote only sanitized screenshots and summary counts.
- Keep raw reports ignored under `reports/`.
- Add a short demo walkthrough video or GIF if runtime remains stable.

### Stage 3 - AWS staging apply

Objective: turn the AWS blueprint into a real staging environment while controlling cost and secrets.

Tasks:

- Create a dedicated AWS account or sandbox project.
- Configure S3 remote state and DynamoDB lock from `backend.s3.example.hcl`.
- Create budget alarms before applying.
- Provision secrets through AWS Secrets Manager, not committed files.
- Run Terraform plan review, then apply only after manual approval.
- Deploy with Helm or Argo CD using immutable image tags.
- Run smoke, OpenAPI, E2E, metrics, and backup verification against staging.

### Stage 4 - Security and supply chain maturity

Objective: move from strong portfolio security to release-grade supply chain evidence.

Tasks:

- Add cosign keyless signing for release images.
- Verify signatures before Helm production deploy.
- Add OWASP ZAP baseline scan against the gateway in a runtime job.
- Enforce SBOM availability for every release image.
- Add a manual security acceptance checklist to release notes.

### Stage 5 - Long-running operations proof

Objective: prove the system behaves over time.

Tasks:

- Run the staging stack for several days with scheduled smoke tests.
- Capture SLO snapshots, alert history, and resource usage.
- Run one restore drill from PostgreSQL backups.
- Run one dependency degradation drill for Kafka, OpenSearch, SMTP, and AI fallback.
- Write a short postmortem-style report for any failure found.

## Reviewer Interpretation Guide

Use this table to avoid over-reading the repository:

| Claim | Correct interpretation |
|---|---|
| "Production-grade portfolio" | The codebase models production engineering practices and has verification evidence |
| "Cloud ready" | Terraform, Helm, K8s, and GitOps are validated blueprints, not a live AWS deployment |
| "Runtime proof" | Docker-local runtime can be verified by scripts and screenshots |
| "AI assistant" | Cost-safe Claude Haiku integration with deterministic fallback for CI |
| "Security evidence" | Static, dependency, secret, image, and policy checks are present, but no paid external audit is claimed |
| "Monitoring" | Dashboards, alerts, domain metrics, and smoke checks exist, but no real customer traffic history is claimed |

## Definition Of Done For "Fully Production"

The project should only be described as a live production system after all of the following are true:

- A real staging or production AWS environment is deployed from the Terraform and Helm path.
- DNS, TLS, ingress, secrets, database backups, and rollback are tested against that environment.
- Release images are signed and verified before deployment.
- Runtime smoke, E2E, OpenAPI, metrics, and backup drills pass against the hosted environment.
- SLO dashboards contain multi-day traffic data.
- At least one incident or game-day drill has a written, sanitized report.

Until then, the accurate positioning is: **production-grade portfolio with apply-ready cloud blueprint and strong local/runtime evidence**.

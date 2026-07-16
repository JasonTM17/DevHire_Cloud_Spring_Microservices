# DevHire Cloud - Microservices Recruitment Platform

[![CI](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/ci.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/ci.yml)
[![Docker](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docker.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docker.yml)
[![Release Images](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/release.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/release.yml)
[![Security](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/security.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/security.yml)
[![Terraform](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/terraform.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/terraform.yml)
[![Docs](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docs.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docs.yml)

DevHire Cloud is a Java, systems, and DevOps learning project for a recruitment platform: Java 21, Spring Boot 4.0, Next.js, Kafka, OpenSearch, PostgreSQL, Redis, Docker, Kubernetes, Terraform, and a controlled Claude Haiku AI assistant. The repository documents service boundaries, owned data, event reliability, observability, security, CI/CD, and cloud-readiness evidence so reviewers can verify each claim against the code and supporting records.

## 30-Second Reviewer Brief

| Question | Answer |
|---|---|
| What is being demonstrated? | A microservices hiring platform with candidate, employer, admin/ops, platform, AI, and code-assessment workflows. |
| What is the flagship feature? | Code Assessment Studio: Java LeetCode-style candidate coding, visible runner analysis, hidden server-side tests, 75/25 runtime-plus-rubric scoring, integrity/similarity signals, employer assignment/review, admin challenge authoring, and runner health. |
| What is production-shaped? | Service-owned databases, Flyway migrations, Kafka/outbox, idempotent consumers, Prometheus/Grafana/Loki/Tempo/OTel, security scans, SBOM, Docker image publishing, Helm, raw Kubernetes, Argo CD, and AWS Terraform blueprint. |
| What is not claimed? | This is not a live customer SaaS. AWS remains an apply-ready blueprint until a credentialed deployment phase is approved. |

## Public Repository Status

| Signal | Current |
|---|---|
| Latest public release | [v0.6.0](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.6.0) |
| Current development cycle | `0.6.0-SNAPSHOT` release cut; next snapshot bump is a post-release maintenance step |
| v0.6 Stitch app | Merged into `master`; Code Assessment Studio is the flagship candidate grading, employer review, and admin health workflow |
| Default branch | `master`, protected and PR-governed |
| Dependency updates | [View the current Dependabot queue](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/pulls?q=is%3Apr+is%3Aopen+author%3Aapp%2Fdependabot); maintenance policy is documented in [docs/dependency-maintenance.md](docs/dependency-maintenance.md). |
| v1 status | Roadmap and acceptance checklist only, not a released tag |

## Reviewer Quick Links

| Need | Link |
|---|---|
| Documentation index | [docs/INDEX.md](docs/INDEX.md) |
| English docs | [docs/README_EN.md](docs/README_EN.md) |
| Japanese docs | [docs/README_JA.md](docs/README_JA.md) |
| Current status | [docs/status.md](docs/status.md) |
| Evidence pack | [docs/REVIEW_EVIDENCE.md](docs/REVIEW_EVIDENCE.md) |
| Code assessment proof | [docs/code-assessment-reviewer-proof.md](docs/code-assessment-reviewer-proof.md) |
| Stitch redesign | [docs/ui-redesign-v0.6.md](docs/ui-redesign-v0.6.md) |
| Architecture review | [docs/architecture-review-index.md](docs/architecture-review-index.md) |
| Service catalog | [docs/service-catalog.md](docs/service-catalog.md) |
| Container images | [docs/container-images.md](docs/container-images.md) |
| Code assessment ops runbook | [docs/runbooks/code-assessment-runner.md](docs/runbooks/code-assessment-runner.md) |
| Security evidence | [docs/security-evidence.md](docs/security-evidence.md) |
| Cloud readiness | [docs/cloud-readiness-review.md](docs/cloud-readiness-review.md) |
| Production scorecard | [docs/production-engineering-scorecard.md](docs/production-engineering-scorecard.md) |

### Simplified system topology

This reviewer map groups related services for readability; it is not a complete protocol or event-edge diagram.

```mermaid
flowchart LR
  UI["Next.js frontend"] --> GW["Spring Cloud Gateway"]
  GW --> ID["Auth + User"]
  GW --> HIRE["Company + Job + Application"]
  GW --> OPS["Notification + Audit"]
  GW --> AI["Claude AI service"]
  HIRE --> RUNNER["Assessment runner"]
  HIRE <--> KAFKA[("Kafka + outbox")]
  ID --> PG[("Service-owned PostgreSQL")]
  HIRE --> PG
  OPS --> PG
  AI --> PG
  HIRE --> SEARCH[("OpenSearch")]
  ID --> REDIS[("Redis")]
```

[Review the detailed service boundaries and event flows](docs/architecture.md).

## Architecture and Operations Proof

| Layer | Proof in this repository |
|---|---|
| Edge | Spring Cloud Gateway, JWT validation, CORS, rate limiting, centralized error response, route metrics |
| Core services | auth, user, company, job, application, assessment-runner, notification, audit, AI |
| Data ownership | PostgreSQL database/schema per service, Flyway migrations, no shared JPA entities |
| Messaging | Kafka domain events, transactional outbox, retry/dead-letter posture, idempotent consumers |
| Search | OpenSearch adapter with PostgreSQL fallback |
| AI | Claude Haiku assistant with citations, tool traces, safety guardrails, deterministic fallback, metrics |
| Code assessment | Internal Judge0-compatible runner boundary, Java `CandidateSolution.solve(String input)` contract, versioned visible/hidden stdout fixtures, submission history, admin challenge authoring with reference validation, 75/25 rubric scoring, integrity and similarity risk, audit metadata |
| Observability | Actuator, Prometheus, Grafana, Loki, Tempo, OpenTelemetry, domain KPI dashboards and alert rules |
| Security | JWT/RBAC, refresh-token rotation, gateway spoofing protection, Gitleaks, Trivy, CodeQL, SBOM, branch protection |
| Delivery | Maven verification, Docker image matrix, GHCR/Docker Hub publishing, GitHub Actions, Helm, raw Kubernetes, Argo CD, Terraform AWS blueprint |

## v0.6 Product Surface

| Area | Routes and workflows |
|---|---|
| Candidate | `/jobs`, `/jobs/[id]`, `/candidate`, applications, profile, code assessments, offers, interview prep, roadmap, skill analytics, community |
| Employer | `/employer`, `/companies/[slug]`, code assessment review dossier |
| Admin/Ops | `/admin`, `/admin/ai`, code-assessment health, AI operations, platform signals |
| Platform | `/assistant`, `/platform/observability`, `/platform/cloud`, `/platform/releases` |

The v0.6 UI follows Stitch project `projects/5421325194779586117` with a hybrid design system. Public candidate and job-discovery pages use an ITViec-inspired marketplace pattern: search-first red/white surfaces, salary/location/company prominence, compact filters, and mobile-safe job cards without copying ITViec brand assets. Employer, admin, and platform pages keep the "DevHire Cloud Operations" control-plane style: dark navigation, light operational workspace, dense panels, 8px radius, Inter typography, and evidence-heavy status language. Route-matrix screenshots are checked for broken assets, overflow, raw UUIDs, `UNKNOWN`, loading-only states, fallback banners, smoke labels, mojibake, and hidden assessment payloads.

## Client and Assessment UX

| Surface | Professional contract |
|---|---|
| Job marketplace | `/`, `/jobs`, and `/jobs/[id]` prioritize keyword search, city/skill/salary filters, company credibility, salary clarity, login-safe apply states, and mobile layouts. |
| Candidate assessment | `/candidate/assessments` presents `Cloud Architecture Challenge` as a Java-first LeetCode-style studio with `CandidateSolution.java`, visible/custom runs, locked submission history, and hidden-test redaction. |
| Employer review | `/employer` and `/employer/applications` show assignment/review context, candidate code, runtime/static score, visible and hidden aggregate evidence, risk flags, and immutable raw score. |
| Admin/Ops | `/admin` and `/admin/monitoring` show runner health, fail-closed posture, queue depth, verdict rates, policy/timeout/unavailable rates, and backlog signals. |

## Cloud State Matrix

| Target | State | Verification |
|---|---|---|
| Docker Compose | Full local stack for backend, frontend, data, messaging, and observability | `docker compose config --quiet` |
| Raw Kubernetes | Renderable manifests, no `latest`, includes `ai-service` | `kubectl kustomize deploy/k8s` |
| Helm | Local, staging, production, and AWS values | `.\scripts\cloud-verify.ps1` |
| Terraform AWS | Apply-ready blueprint validation; no credentials required for CI validation | `.\scripts\terraform-validate.ps1` |
| GitOps | Argo CD samples targeting `master` | [deploy/gitops](deploy/gitops) |

## Container Images

Release images publish to GHCR as `ghcr.io/jasontm17/devhire/<service>:<tag>` with commit SHA tags, OCI labels, SBOM, and BuildKit provenance. Docker Hub mirrors are available as `docker.io/nguyenson1710/devhire-cloud-<service>:<tag>` when the Docker Hub secrets are configured. The current preview set was also pushed locally through Docker Desktop. See [container images](docs/container-images.md).

Production code grading requires `DEVHIRE_RUNNER_MODE=judge0` and `JUDGE0_BASE_URL`; local development can keep deterministic preview mode. Use `scripts/code-assessment-smoke.ps1` through the Gateway for assign/run/submit/review coverage, and `scripts/judge0-smoke.ps1` against `assessment-runner-service` to verify health, accepted, wrong-answer, compile-error, timeout, and policy-blocked Java submissions. Operational triage lives in the [code assessment runner runbook](docs/runbooks/code-assessment-runner.md).

## Run and Verify Locally

Port convention:

| Mode | Gateway | Frontend | When to use |
|---|---:|---:|---|
| Compose default | `8080` | `3001` | Fresh local stack with no port conflicts |
| Docker Desktop high-port smoke | `18080` | `13001` | CI parity, existing local services, or reviewer machines with common ports occupied |

```powershell
docker compose up -d --build
.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080
.\scripts\code-assessment-smoke.ps1 -GatewayUrl http://localhost:8080
```

High-port smoke path:

```powershell
$env:GATEWAY_HOST_PORT="18080"
$env:FRONTEND_HOST_PORT="13001"
docker compose up -d --build
.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:18080
.\scripts\code-assessment-smoke.ps1 -GatewayUrl http://localhost:18080
.\scripts\runtime-observability-smoke.ps1 -GatewayUrl http://localhost:18080
.\scripts\reset-demo-data.ps1
.\scripts\secret-config-audit.ps1
```

Frontend preview without Docker:

```powershell
cd frontend
npm ci
npm run e2e:all
```

Portfolio verification:

```powershell
.\scripts\version-consistency.ps1
.\scripts\portfolio-verify.ps1 -Docs -Docker -Cloud
.\scripts\api-compatibility.ps1 -ManifestOnly
.\scripts\docs-parity.ps1
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@devhire.local` | `Admin@123456` |
| Employer | `employer@devhire.local` | `Employer@123456` |
| Candidate | `candidate@devhire.local` | `Candidate@123456` |

## Product Evidence

| Jobs | Job Detail |
|---|---|
| ![Jobs](docs/screenshots/jobs-page.png) | ![Job detail](docs/screenshots/job-detail.png) |

| Candidate | Employer | Admin |
|---|---|---|
| ![Candidate](docs/screenshots/candidate-dashboard.png) | ![Employer](docs/screenshots/employer-dashboard.png) | ![Admin](docs/screenshots/admin-dashboard.png) |

| Code Assessment Studio | Employer Review Dossier | Admin Assessment Health |
|---|---|---|
| ![Candidate assessment](docs/screenshots/stitch/candidate-assessments.png) | ![Employer review](docs/screenshots/stitch/employer-pipeline.png) | ![Admin assessment health](docs/screenshots/stitch/admin-control-plane.png) |

| Stitch Candidate Apps | Stitch Cloud | Stitch Releases |
|---|---|---|
| ![Candidate applications](docs/screenshots/stitch/candidate-applications.png) | ![Cloud](docs/screenshots/stitch/platform-cloud.png) | ![Releases](docs/screenshots/stitch/platform-releases.png) |

| AI Assistant | Grafana SLO | Prometheus Rules |
|---|---|---|
| ![Assistant](docs/screenshots/assistant-page.png) | ![Grafana SLO](docs/screenshots/ops-grafana-slo.png) | ![Prometheus rules](docs/screenshots/ops-prometheus-rules.png) |

The full visual evidence set is machine-checked in [docs/evidence-manifest.json](docs/evidence-manifest.json).

## v1 Roadmap

`v1.0.0` is not released. The v1 roadmap focuses on product UX depth, backend integration maturity, API/event compatibility, observability SLO maturity, deterministic data depth, cloud apply evidence, and supply-chain hardening. See [v1 reviewer guide](docs/v1-reviewer-guide.md), [v1 demo script](docs/v1-demo-script.md), and [v1 production gap register](docs/v1-production-gap-register.md).

## Honest Scope

DevHire Cloud is a learning project that practices production-engineering patterns, not a claim of live customer traffic. It does not claim external penetration testing, a production AWS account, or real customer data. Secrets are not committed; cloud apply remains a separate, credentialed operation.

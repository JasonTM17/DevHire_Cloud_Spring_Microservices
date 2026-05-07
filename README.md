# DevHire Cloud - Microservices Recruitment Platform

[![CI](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/ci.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/ci.yml)
[![Docker](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docker.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docker.yml)
[![Security](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/security.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/security.yml)
[![Terraform](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/terraform.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/terraform.yml)
[![Docs](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docs.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docs.yml)

DevHire Cloud là portfolio production engineering cho một nền tảng tuyển dụng kiểu mini ITviec / LinkedIn Jobs, xây bằng Java 21, Spring Boot 3.5, Next.js, Kafka, OpenSearch, Docker, Kubernetes, Terraform AWS blueprint và Claude Haiku AI assistant. Mục tiêu là chứng minh tư duy microservices thật: service boundary rõ, database sở hữu theo service, event/outbox, observability domain KPI, CI/CD, security, cloud readiness và evidence có thể kiểm chứng.

## Public Repository Status

| Signal | Current |
|---|---|
| Latest public release | [v0.5.1](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.5.1) |
| Current development cycle | `0.6.0-SNAPSHOT` |
| v0.6 Stitch app | PR #43 green; v0.6.4 adds candidate code assessment grading on the stacked branch |
| Branch governance | `master` protected, PR-based release flow |
| Dependabot queue | 0 open PRs at latest cleanup scan |
| v1 status | Roadmap and acceptance checklist only, not a released tag |

## Reviewer Quick Links

| Need | Link |
|---|---|
| English docs | [docs/README_EN.md](docs/README_EN.md) |
| Japanese docs | [docs/README_JA.md](docs/README_JA.md) |
| Current status | [docs/status.md](docs/status.md) |
| Evidence pack | [docs/REVIEW_EVIDENCE.md](docs/REVIEW_EVIDENCE.md) |
| v0.6 Stitch redesign | [docs/ui-redesign-v0.6.md](docs/ui-redesign-v0.6.md) |
| Architecture | [docs/architecture-review-index.md](docs/architecture-review-index.md) |
| Service catalog | [docs/service-catalog.md](docs/service-catalog.md) |
| Security evidence | [docs/security-evidence.md](docs/security-evidence.md) |
| Cloud readiness | [docs/cloud-readiness-review.md](docs/cloud-readiness-review.md) |
| Production scorecard | [docs/production-engineering-scorecard.md](docs/production-engineering-scorecard.md) |

## Architecture Proof

| Layer | Implementation |
|---|---|
| Edge | Spring Cloud Gateway, JWT validation, CORS, rate limit, centralized error shape |
| Core services | auth, user, company, job, application, notification, audit, AI |
| Data ownership | PostgreSQL database/schema per service, Flyway migrations, no shared JPA entities |
| Messaging | Kafka events, transactional outbox, idempotent consumers |
| Search | OpenSearch adapter with PostgreSQL fallback |
| AI | Claude Haiku assistant with citations, tool traces, safety guardrails, metrics |
| Code assessment | Deterministic rubric grading for candidate submissions, employer review, admin health metrics |
| Observability | Actuator, Prometheus, Grafana, Loki, Tempo, OpenTelemetry, domain KPI dashboards |
| Delivery | Maven, Docker matrix, GitHub Actions, Helm, raw K8s, Argo CD, Terraform AWS blueprint |

## v0.6 Full-App Product Surface

| Area | Routes |
|---|---|
| Candidate | `/jobs`, `/jobs/[id]`, `/candidate`, applications, profile, code assessments, offers, interview prep, roadmap, skill analytics, community |
| Employer | `/employer`, `/companies/[slug]`, code-review queue |
| Admin/Ops | `/admin`, `/admin/ai`, code assessment health |
| Platform | `/assistant`, `/platform/observability`, `/platform/cloud`, `/platform/releases` |

The v0.6 work follows Stitch project `projects/5421325194779586117`. Primary screenshots are checked to avoid raw UUIDs, `UNKNOWN`, loading-only states, smoke labels, offline banners and fallback banners. v0.6.4 turns the Skill Assessment screen into a real code grading workflow with safe static scoring; sandbox execution is intentionally reserved for a later isolated-worker phase.

## Cloud State Matrix

| Target | State | Verification |
|---|---|---|
| Docker Compose | Full local stack | `docker compose config --quiet` |
| Raw Kubernetes | Renderable, no `latest`, includes `ai-service` | `kubectl kustomize deploy/k8s` |
| Helm | Local/staging/prod/AWS values | `.\scripts\cloud-verify.ps1` |
| Terraform AWS | Blueprint validate only, no AWS credentials required | `.\scripts\terraform-validate.ps1` |
| GitOps | Argo CD samples targeting `master` | [deploy/gitops](deploy/gitops) |

## Run Locally

```powershell
docker compose up -d --build
.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080
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
.\scripts\docs-parity.ps1
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@devhire.local` | `Admin@123456` |
| Employer | `employer@devhire.local` | `Employer@123456` |
| Candidate | `candidate@devhire.local` | `Candidate@123456` |

## Product Screenshots

| Jobs | Job Detail |
|---|---|
| ![Jobs](docs/screenshots/jobs-page.png) | ![Job detail](docs/screenshots/job-detail.png) |

| Candidate | Employer | Admin |
|---|---|---|
| ![Candidate](docs/screenshots/candidate-dashboard.png) | ![Employer](docs/screenshots/employer-dashboard.png) | ![Admin](docs/screenshots/admin-dashboard.png) |

| Stitch Candidate Apps | Stitch Cloud | Stitch Releases |
|---|---|---|
| ![Candidate applications](docs/screenshots/stitch/candidate-applications.png) | ![Cloud](docs/screenshots/stitch/platform-cloud.png) | ![Releases](docs/screenshots/stitch/platform-releases.png) |

| AI Assistant | Grafana SLO |
|---|---|
| ![Assistant](docs/screenshots/assistant-page.png) | ![Grafana SLO](docs/screenshots/ops-grafana-slo.png) |

The full visual evidence set is machine-checked in [docs/evidence-manifest.json](docs/evidence-manifest.json).

## v1 Roadmap

`v1.0.0` chưa được release. Roadmap v1 tập trung vào product UX, backend integration maturity, API/event compatibility, observability SLO maturity, deterministic data depth, cloud apply-ready evidence và supply-chain hardening. Xem [v1 reviewer guide](docs/v1-reviewer-guide.md), [v1 demo script](docs/v1-demo-script.md) và [v1 production gap register](docs/v1-production-gap-register.md).

## Honest Scope

DevHire Cloud là production engineering portfolio, không phải SaaS có traffic khách hàng thật. AWS đang ở mức apply-ready blueprint; không chạy `terraform apply`, không commit secret và không claim external pentest.

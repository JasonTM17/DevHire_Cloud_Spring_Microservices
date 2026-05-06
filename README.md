# DevHire Cloud - Microservices Recruitment Platform

[![CI](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/ci.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/ci.yml)
[![Docker](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docker.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docker.yml)
[![Security](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/security.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/security.yml)
[![Terraform](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/terraform.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/terraform.yml)
[![Docs](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docs.yml/badge.svg)](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/actions/workflows/docs.yml)

DevHire Cloud là một portfolio microservices Java 21 / Spring Boot 3.5 cho nền tảng tuyển dụng kiểu mini ITviec/LinkedIn Jobs. Dự án tập trung vào ranh giới service thật, dữ liệu giàu, CI/CD, Docker/Kubernetes/Terraform, observability domain KPI, và Claude Haiku AI assistant.

## Public Repository Status

| Signal | Current |
|---|---|
| Latest public release | [v0.5.1](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.5.1) |
| Current development cycle | `0.6.0-SNAPSHOT` |
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
| Architecture | [docs/architecture-review-index.md](docs/architecture-review-index.md) |
| Service catalog | [docs/service-catalog.md](docs/service-catalog.md) |
| Cloud readiness | [docs/cloud-readiness-review.md](docs/cloud-readiness-review.md) |
| Production scorecard | [docs/production-engineering-scorecard.md](docs/production-engineering-scorecard.md) |

## Architecture Proof

| Layer | Implementation |
|---|---|
| Edge | Spring Cloud Gateway, JWT validation, CORS, rate limit, centralized error shape |
| Core services | auth, user, company, job, application, notification, audit, AI |
| Data ownership | PostgreSQL database/schema per service, Flyway migrations, no shared JPA entities |
| Messaging | Kafka events plus transactional outbox and idempotent consumers |
| Search | OpenSearch adapter with PostgreSQL fallback path |
| AI | Claude Haiku assistant with RAG-style citations, tool traces, safety fallback, metrics |
| Observability | Actuator, Prometheus, Grafana, Loki, Tempo, OpenTelemetry, domain KPI dashboards |
| Delivery | Maven, Docker matrix, GitHub Actions, Helm, K8s, Argo CD, AWS Terraform blueprint |

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

| AI Assistant | Grafana SLO |
|---|---|
| ![Assistant](docs/screenshots/assistant-page.png) | ![Grafana SLO](docs/screenshots/ops-grafana-slo.png) |

## v1 Roadmap

`v1.0.0` chưa được release. Roadmap v1 tập trung vào frontend product UX, backend integration maturity, API/event compatibility, observability SLO maturity, dataset depth, cloud apply-ready evidence, and supply-chain hardening. Xem [v1 reviewer guide](docs/v1-reviewer-guide.md), [v1 demo script](docs/v1-demo-script.md), và [v1 production gap register](docs/v1-production-gap-register.md).

## Honest Scope

DevHire Cloud là production engineering portfolio, không phải SaaS có traffic khách hàng thật. AWS đang ở mức apply-ready blueprint; không chạy `terraform apply`, không commit secret, không claim external pentest.

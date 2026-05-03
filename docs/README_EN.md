# DevHire Cloud

DevHire Cloud is a production-style Java Spring Boot microservices recruitment platform built as a backend, DevOps, and solution architecture portfolio project. It models a compact ITviec/LinkedIn Jobs workflow with authentication, employer onboarding, job publishing, candidate applications, notifications, audit logs, search, a Claude Haiku AI assistant, observability, CI/CD, Docker, Kubernetes, Terraform, and a Next.js UI.

## Portfolio Screenshots

Screenshots are generated from the real frontend through Playwright and Docker runtime checks.

| Jobs | Job Detail |
|---|---|
| ![Jobs page](screenshots/frontend-redesign-jobs.png) | ![Job detail](screenshots/frontend-redesign-job-detail.png) |

Docker runtime through the real API Gateway:

![Docker runtime jobs](screenshots/docker-runtime-jobs.png)

| Candidate | Employer | Admin |
|---|---|---|
| ![Candidate dashboard](screenshots/candidate-dashboard.png) | ![Employer dashboard](screenshots/employer-dashboard.png) | ![Admin dashboard](screenshots/admin-dashboard.png) |

Claude AI assistant:

![Claude AI assistant](screenshots/assistant-page.png)

## Architecture Snapshot

- `api-gateway` is the public ingress for JWT validation, routing, CORS, and Redis rate limiting.
- Each backend service owns its PostgreSQL database and Flyway migrations.
- Kafka domain events are published through transactional outbox tables.
- Notification and audit consumers are idempotent.
- Job search uses OpenSearch with PostgreSQL fallback.
- `ai-service` answers recruiter questions with Claude Haiku, citations, tool traces, metrics, and safe fallback mode.
- Observability is wired through Actuator, Prometheus, Grafana, OpenTelemetry, Tempo, and Loki.

## Services

| Service | Port | Responsibility |
|---|---:|---|
| api-gateway | 8080 | Public ingress, JWT validation, routing, CORS, rate limiting |
| auth-service | 8081 | Register, login, refresh rotation, logout, current user |
| user-service | 8082 | Candidate and employer profiles |
| company-service | 8083 | Company onboarding and admin review |
| job-service | 8084 | Job workflow and OpenSearch search |
| application-service | 8085 | Candidate applications, status changes, history |
| notification-service | 8086 | Internal notifications and optional SMTP delivery |
| audit-service | 8087 | Audit ingestion and admin log search |
| ai-service | 8088 | Claude Haiku assistant, RAG context, conversations, metrics, audit |
| frontend | 3001 | Next.js role dashboards and job browsing |

## Run

```bash
docker compose up --build
```

- Frontend: `http://localhost:3001`
- Gateway: `http://localhost:8080`
- Grafana: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- OpenSearch: `http://localhost:9200`
- Assistant: `http://localhost:3001/assistant`

## Verify

```bash
mvn -T1 clean verify
```

```powershell
cd frontend
npm ci
npm run typecheck
npm run build
```

```powershell
./scripts/api-smoke.ps1 -GatewayUrl http://localhost:8080
```

```powershell
./scripts/ai-eval.ps1 -GatewayUrl http://localhost:8080
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@devhire.local` | `Admin@123456` |
| EMPLOYER | `employer@devhire.local` | `Employer@123456` |
| CANDIDATE | `candidate@devhire.local` | `Candidate@123456` |

## Production Highlights

- Java 21, Spring Boot 3.5.13, Spring Cloud 2025.0.2.
- Service-owned databases, Flyway, constraints, indexes, and optimistic locking.
- Gateway JWT validation, refresh token rotation, Redis token blacklist, CORS, and rate limiting.
- Kafka, transactional outbox, idempotent consumers, and audit events.
- OpenSearch search adapter with PostgreSQL fallback.
- Claude Haiku AI assistant with citations, streaming UI, provider circuit breaker, metrics, and audit events.
- SMTP notification delivery queue with retry/backoff and persisted delivery status.
- Standard error response with trace ID.
- Docker Compose full stack, Helm, Argo CD, Kubernetes, and AWS Terraform blueprint.
- GitHub Actions CI/CD, Trivy, Gitleaks, SBOM, Dependabot, AI eval, k6 smoke, and Playwright E2E.

## Key Docs

- [Architecture](architecture.md)
- [Portfolio case study](portfolio-case-study.md)
- [Production readiness](production-readiness.md)
- [Security and supply chain](security.md)
- [Deployment runbook](deployment.md)
- [SLO operations](slo.md)
- [Claude AI assistant](ai-assistant.md)
- [Claude Haiku provider](claude-haiku.md)
- [AI evaluation gate](ai-evaluation.md)
- [AWS Terraform blueprint](aws-terraform.md)
- [10-minute demo script](demo-script.md)
- [GitHub profile checklist](github-profile.md)

## Roadmap After v0.1.0

- Deploy the blueprint to a real AWS staging account.
- Add stronger long-running load tests and error-budget burn simulations.
- Add a real email provider production sandbox.

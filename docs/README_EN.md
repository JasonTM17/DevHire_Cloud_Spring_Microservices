# DevHire Cloud

DevHire Cloud is a production-style Java Spring Boot microservices recruitment platform for portfolio use. It models a small ITviec/LinkedIn Jobs experience with authentication, employer company onboarding, job posting, candidate applications, internal notifications, audit logs, search, observability, Docker and CI/CD.
It also includes a small Next.js frontend for the main Candidate, Employer and Admin workflows.

## Portfolio Screenshots

Screenshots are generated from the real frontend through Playwright E2E.

| Jobs | Job Detail |
|---|---|
| ![Jobs page](screenshots/jobs-page.png) | ![Job detail](screenshots/job-detail.png) |

| Candidate | Employer | Admin |
|---|---|---|
| ![Candidate dashboard](screenshots/candidate-dashboard.png) | ![Employer dashboard](screenshots/employer-dashboard.png) | ![Admin dashboard](screenshots/admin-dashboard.png) |

Important docs:

- [Architecture](architecture.md)
- [Security and supply chain](security.md)
- [Deployment runbook](deployment.md)
- [Gmail SMTP runbook](gmail-smtp.md)
- [Production checklist](production-checklist.md)
- [10-minute demo script](demo-script.md)
- [Architecture Decision Records](ADR/0001-microservices-and-service-databases.md)

## Stack

- Java 21, Maven multi-module
- Spring Boot 3.5.13, Spring Cloud 2025.0.2
- Spring Cloud Gateway, Spring Security, JWT, BCrypt
- PostgreSQL, Flyway, JPA/Hibernate
- OpenSearch job search with PostgreSQL fallback
- Transactional outbox and idempotent Kafka consumers
- Redis, Kafka, OpenFeign
- Actuator, Micrometer, Prometheus, Grafana, OpenTelemetry, Tempo, Loki
- JUnit 5, Mockito, MockMvc, Testcontainers PostgreSQL, JaCoCo
- Docker Compose and GitHub Actions
- Kubernetes, Helm and Argo CD GitOps sample
- Trivy, Gitleaks and SBOM generation
- Next.js 16, React 19 and TypeScript frontend

## Services

| Service | Port | Responsibility |
|---|---:|---|
| api-gateway | 8080 | Public ingress, JWT validation, routing, CORS, Redis rate limiting |
| auth-service | 8081 | Register, login, refresh rotation, logout, current user |
| user-service | 8082 | Candidate and employer profiles |
| company-service | 8083 | Company onboarding and admin review |
| job-service | 8084 | Job workflow and OpenSearch search |
| application-service | 8085 | Candidate applications, status changes, history |
| notification-service | 8086 | Event-driven internal notifications and optional SMTP email delivery |
| audit-service | 8087 | Audit ingestion and admin log search |
| frontend | 3001 | Next.js UI for jobs and role dashboards |

## Run

```bash
docker compose up --build
```

Gateway is available at `http://localhost:8080`.
Frontend is available at `http://localhost:3001` when running Docker Compose.

## Test

```bash
mvn clean verify
```

The build runs unit tests, controller tests, event contract tests and Testcontainers PostgreSQL integration tests.

CI also runs `scripts/check-coverage.ps1` as a hard per-module coverage gate after Maven verification.
Frontend verification uses `npm ci`, `npm run typecheck` and `npm run build`.

Gateway API smoke verification:

```powershell
./scripts/api-smoke.ps1 -GatewayUrl http://localhost:8080
```

To let the script build and start the full Docker stack on high local ports:

```powershell
./scripts/api-smoke.ps1 -StartStack -Build
```

The smoke script logs in with all demo roles, creates and approves a company, creates and approves a job, searches the published job, submits an application, updates the application status, then checks notifications and audit logs through the API Gateway.

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@devhire.local` | `Admin@123456` |
| EMPLOYER | `employer@devhire.local` | `Employer@123456` |
| CANDIDATE | `candidate@devhire.local` | `Candidate@123456` |

## Key Gateway Endpoints

- `POST /api/auth/login`
- `GET /api/users/me`
- `POST /api/companies`
- `PATCH /api/admin/companies/{id}/approve`
- `POST /api/jobs`
- `GET /api/jobs`
- `PATCH /api/admin/jobs/{id}/approve`
- `POST /api/jobs/{jobId}/applications`
- `PATCH /api/applications/{id}/status`
- `GET /api/notifications`
- `GET /api/admin/audit-logs`

See [api.http](api.http) for a runnable flow.

## Observability

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` with `admin/admin`
- Tempo: `http://localhost:3200`
- OpenSearch: `http://localhost:9200`
- Metrics endpoint per service: `/actuator/prometheus`
- Health endpoint per service: `/actuator/health`

## Production-Ready Highlights

- Service-owned databases with Flyway migrations.
- OpenSearch adapter for published job search with PostgreSQL fallback.
- Real constraints and indexes.
- JWT and refresh token rotation.
- Gateway-side JWT validation and rate limiting.
- Kafka domain events.
- Transactional outbox with idempotent notification/audit consumers.
- SMTP email delivery queue with retry/backoff, rate limiting and persisted delivery status.
- Gmail SMTP setup and smoke-test scripts: [gmail-smtp.md](gmail-smtp.md).
- Standard error response with trace id.
- Docker Compose full local stack.
- CI, Docker image build workflow, dependency review, Trivy, Gitleaks, SBOM and release image publishing.
- Helm chart and Argo CD GitOps sample.
- Tests include Testcontainers and event contract checks.
- Hard JaCoCo coverage gate in CI.
- Next.js frontend wired to the API Gateway.

## Deployment

- `deploy/docker-compose.prod.yml`: production Compose sample for externally managed PostgreSQL, Redis, Kafka and tagged images.
- `deploy/k8s`: Kubernetes baseline with namespace, config map, secret template, deployments, services, ingress and HPA examples.
- `deploy/helm/devhire-cloud`: Helm chart with local, staging and production values.
- `deploy/gitops/argocd-application.yaml`: Argo CD sample.
- `docs/deployment.md`: runbook for release, deploy, health checks and rollback.

Preview Kubernetes manifests:

```bash
kubectl kustomize ./deploy/k8s
```

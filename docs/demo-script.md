# DevHire Cloud 10-Minute Demo Script

## 0. Start

```powershell
docker compose up --build
```

Open:

- Frontend: `http://localhost:3001`
- Gateway: `http://localhost:8080`
- Grafana: `http://localhost:3000`
- OpenSearch: `http://localhost:9200`

If default ports are busy, use `scripts/e2e-smoke.ps1 -Build -KeepRunning` to start the stack on high local ports.

## 1. Candidate Flow

1. Open `/jobs`.
2. Search a Java or backend keyword.
3. Open a job detail page.
4. Login with `candidate@devhire.local` / `Candidate@123456`.
5. Open the candidate dashboard and review saved application/notification style data.

Talking points:

- Public job search goes through API Gateway.
- Published jobs are indexed in OpenSearch with PostgreSQL fallback.
- Candidate data is read through service-owned APIs.

## 2. Employer Flow

1. Login with `employer@devhire.local` / `Employer@123456`.
2. Open employer dashboard.
3. Explain company ownership, job posting workflow, and application tracking.

Talking points:

- Employer cannot publish public jobs until company/job approval.
- Application status history is transactional.
- Domain events use transactional outbox before Kafka publishing.

## 3. Admin Flow

1. Login with `admin@devhire.local` / `Admin@123456`.
2. Open admin dashboard.
3. Explain company/job approval and audit log visibility.

Talking points:

- Admin-only endpoints are protected by role checks.
- Audit log consumer is idempotent through `processed_events`.

## 4. Observability

1. Open Grafana.
2. Show service health, JVM/application metrics, and trace/log stack wiring.
3. Mention Prometheus, Loki, Tempo, OpenTelemetry Collector.

Talking points:

- Actuator readiness/liveness endpoints support Docker/Kubernetes probes.
- Trace IDs are included in standardized error responses and logs.

## 5. Production Portfolio Close

Show these files:

- `README.md`
- `docs/architecture.md`
- `docs/security.md`
- `docs/ADR/`
- `.github/workflows/`
- `deploy/helm/devhire-cloud`
- `docs/screenshots/`

Final message for recruiter:

DevHire Cloud demonstrates Java 21, Spring Boot 3.5, Spring Cloud Gateway, JWT security, service-owned databases, Flyway, Kafka/outbox, OpenSearch, Gmail SMTP hardening, observability, CI/CD, Docker, Kubernetes/Helm/GitOps, tests, and real frontend E2E smoke coverage.

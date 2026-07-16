# DevHire Cloud 10-Minute Demo Script

## 0. Start

```powershell
docker compose up --build
```

Fast guided mode:

```powershell
scripts/portfolio-demo.ps1 -Build -ResetBefore
```

Open:

- Frontend: `http://localhost:3001`
- Gateway: `http://localhost:8080`
- Grafana: `http://localhost:3000`
- OpenSearch: `http://localhost:9200`
- Claude assistant: `http://localhost:3001/assistant`

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

## 4. Claude Haiku AI Assistant

1. Login with `candidate@devhire.local` / `Candidate@123456`.
2. Open `/assistant`.
3. Ask: `Explain this microservices platform to a recruiter`.
4. Show the model badge, fallback badge when no secret is configured, citations, and tool traces.
5. Mention that real Anthropic calls use `ANTHROPIC_API_KEY` from `.env`, GitHub Secrets, Kubernetes Secret, or AWS Secrets Manager only.

Talking points:

- The assistant runs behind API Gateway JWT validation.
- RAG sources include platform docs, ADRs, demo guide, jobs, and platform health context.
- CI tests use mock/fallback behavior and never require a real Claude API key.
- AI usage emits metrics and audit events: `AI_CHAT_REQUESTED`, `AI_TOOL_EXECUTED`, and `AI_FALLBACK_USED`.

## 5. Observability

1. Open Grafana.
2. Show service health, JVM/application metrics, AI request/fallback panels, and trace/log stack wiring.
3. Mention Prometheus, Loki, Tempo, OpenTelemetry Collector.

Talking points:

- Actuator readiness/liveness endpoints support Docker/Kubernetes probes.
- Trace IDs are included in standardized error responses and logs.
- AI assistant latency and fallback behavior are visible in the SLO dashboard.

## 6. Production Portfolio Close

Show these files:

- `README.md`
- `docs/architecture.md`
- `docs/security.md`
- `docs/ADR/`
- `.github/workflows/`
- `deploy/helm/devhire-cloud`
- `docs/screenshots/`

Final message for recruiter:

DevHire Cloud demonstrates Java 21, Spring Boot 4.0, Spring Cloud Gateway, JWT security, service-owned databases, Flyway, Kafka/outbox, OpenSearch, Claude Haiku RAG assistant, Gmail SMTP hardening, observability, CI/CD, Docker, Kubernetes/Helm/GitOps, tests, and real frontend E2E smoke coverage.

Cleanup after a recruiter demo:

```powershell
scripts/reset-demo-data.ps1
```

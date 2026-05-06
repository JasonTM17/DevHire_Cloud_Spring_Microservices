# Runtime Acceptance Matrix

This matrix maps DevHire Cloud runtime claims to black-box checks. It is designed for reviewers who want a concise answer to: "What proves this microservices platform works after it is started?"

Generated command reports are written under `reports/` and are not committed. Some runtime tools may receive temporary JWTs while exercising the stack, so committed evidence must stay sanitized and should summarize status, counts, and commands only.

## Reviewer Commands

Fast static gate:

```powershell
.\scripts\portfolio-verify.ps1 -Docs -Docker
```

Runtime gate after Docker is running:

```powershell
.\scripts\runtime-preflight.ps1
docker compose up -d --build
.\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl http://localhost:8080
```

Sanitized evidence summary from ignored local reports:

```powershell
.\scripts\runtime-evidence-summary.ps1
```

## Acceptance Matrix

| Runtime capability | Primary command | Evidence signal | Failure means | Primary owner |
|---|---|---|---|---|
| Runtime preflight | `runtime-preflight.ps1` | Docker CLI/daemon, Compose syntax, and local port state are reported before stack start | Local machine is not ready for runtime proof | local developer environment |
| Gateway readiness | `portfolio-verify.ps1 -Runtime` | `/actuator/health/readiness` responds before timeout | Stack is not ready or gateway cannot reach dependencies | `api-gateway` |
| Auth login and refresh safety | `runtime-reliability.ps1` | login returns token, refresh rotates, old refresh token is rejected, logout blacklists access token | token lifecycle or Redis blacklist is broken | `auth-service`, `api-gateway`, Redis |
| Company approval workflow | `api-smoke.ps1` | employer creates company and admin approves it through Gateway | RBAC or company workflow is broken | `company-service` |
| Job approval and search | `api-smoke.ps1`, `runtime-reliability.ps1` | employer submits job, admin publishes, candidate search finds it with pagination | job workflow, search indexing, or fallback is broken | `job-service`, OpenSearch, PostgreSQL |
| Application duplicate prevention | `runtime-reliability.ps1` | first apply succeeds, duplicate apply returns `409` | unique constraint or application service transaction boundary is broken | `application-service` |
| Application status history | `runtime-reliability.ps1` | employer updates status and candidate list observes final state | status transition persistence is broken | `application-service` |
| Notification ingestion | `runtime-reliability.ps1`, `email-smoke.ps1` | candidate receives internal notification and Mailpit captures sandbox email | Kafka consumer, idempotency, or SMTP queue is broken | `notification-service`, Kafka, Mailpit |
| Audit ingestion | `runtime-reliability.ps1` | admin audit log includes key actions after login/apply/status change | audit event publishing or consumer path is broken | `audit-service`, Kafka |
| AI assistant safety | `ai-eval.ps1`, `runtime-reliability.ps1` | prompt-injection style request is refused, citations/tool traces remain present, no live API key required | fallback/safety guard or cited answer contract is broken | `ai-service` |
| OpenAPI conformance | `openapi-verify.ps1` | required service paths are present in live `/v3/api-docs` | public API drifted from portfolio contract | all services |
| Runtime domain metrics | `runtime-observability-smoke.ps1` | custom recruitment, outbox, email, audit, search, and AI metrics exist with non-zero seeded samples | observability is only infrastructure-level, not domain-runtime proof | core services and observability |
| Demo data aggregates | `demo-data-summary.ps1 -FromDocker -Aggregates` | runtime counts by job/application/notification/audit/AI state are visible | seed data or migrations drifted from dashboards | service-owned PostgreSQL databases |
| Role-based load smoke | `perf-suite.ps1` | k6 checks pass and thresholds stay inside smoke limits | endpoint latency/error rate regressed | gateway and core services |
| Degraded OpenSearch | `chaos-smoke.ps1 -Scenario opensearch -Recover` | public job search still returns through fallback | fallback adapter or recovery path is broken | `job-service` |
| Kafka outage posture | `chaos-smoke.ps1 -Scenario kafka -Recover` | outbox retains pending work and recovery is explicit | event reliability posture is broken | event publishers, Kafka |
| SMTP outage posture | `chaos-smoke.ps1 -Scenario mail -Recover` | internal notification persists even if delivery is retryable | notification fallback is broken | `notification-service` |
| AI provider outage posture | `chaos-smoke.ps1 -Scenario ai -Recover` | deterministic fallback answers continue without provider key | AI circuit breaker/fallback is broken | `ai-service` |
| Backup and restore drill | `dr-verify.ps1` | service-owned PostgreSQL backup/restore commands are validated with explicit confirmation gates | recovery runbook is incomplete | PostgreSQL and service owners |

## Evidence Rules

- Runtime evidence should be black-box when integration matters: use Gateway and public API paths.
- Generated reports under `reports/` are local artifacts and stay ignored.
- Committed docs should summarize status and commands, not copy raw JWTs, API payloads, SMTP messages, or screenshots containing secrets.
- If Docker is unavailable, mark runtime checks as blocked by environment instead of claiming a pass.
- AWS remains blueprint-only; no Terraform apply is required for this matrix.

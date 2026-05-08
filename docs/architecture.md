# DevHire Cloud Architecture Notes

DevHire Cloud is a Java Spring Boot microservices recruitment platform for portfolio use.

## Service Boundaries

- `api-gateway`: public ingress, JWT validation, routing, CORS, correlation id, and Redis rate limiting.
- `auth-service`: identity, JWT access tokens, refresh token rotation, logout, Redis access-token blacklist, and demo users.
- `user-service`: candidate and employer profile APIs.
- `company-service`: employer company onboarding and admin approval/rejection.
- `job-service`: job posting workflow, OpenSearch-backed published job search, and PostgreSQL fallback search.
- `application-service`: candidate applications, duplicate prevention, status workflow, status history, and code assessment domain ownership.
- `assessment-runner-service`: internal Judge0-compatible boundary for isolated visible/hidden code test execution; it does not own candidate assessment data.
- `notification-service`: internal notification persistence from application events and optional SMTP email delivery after resolving recipient email from `user-service`.
- `audit-service`: audit event ingestion and admin audit log search.
- `ai-service`: Claude Haiku assistant, conversation persistence, curated knowledge retrieval, job/platform tools, metrics, and audit events.
- `common-lib`: shared API response, error model, constants, security headers, pagination, and event DTO contracts.

## Data Ownership

One PostgreSQL container is used locally, but each service has a separate database:

- `devhire_auth`
- `devhire_user`
- `devhire_company`
- `devhire_job`
- `devhire_application`
- `devhire_notification`
- `devhire_audit`
- `devhire_ai`

Services do not share JPA entities and do not read another service's database.

## Communication

- External calls enter through `api-gateway` on port `8080`.
- Synchronous service-to-service queries use OpenFeign:
  - `job-service` calls `company-service` for approved company ownership.
  - `application-service` calls `job-service` for published job and employer ownership facts.
  - `application-service` calls `assessment-runner-service` for isolated code test execution while keeping hidden cases and final scoring server-owned.
- `ai-service` uses WebClient for provider calls and job/platform context tools; it never reads another service database directly.
- Asynchronous communication uses Kafka topics:
  - `audit.events`
  - `application.events`
  - `job.events`
  - `company.events`
  - `notification.events`

## Event Reliability

Producing services write domain events to `outbox_events` in the same PostgreSQL transaction as the business change. A scheduled publisher sends pending rows to Kafka with retry/backoff and terminal `DEAD_LETTER` status. Notification and audit consumers store `processed_events` keyed by `eventId` and consumer name to avoid duplicate processing.

## Search

`job-service` owns the search abstraction. OpenSearch is used for published job search in Docker/production-style profiles, while PostgreSQL full-text search remains as a fallback adapter. This keeps controller and workflow code independent from the search engine.

## Notification Delivery

Internal notifications are persisted first. Email delivery is handled by a scheduled worker that polls due notification rows, resolves recipient email through `user-service`, sends HTML/plain-text email through SMTP, and records delivery state with retry/backoff and rate limiting.

## Security

- Auth-service signs JWT access tokens with `JWT_SECRET`.
- Gateway validates access tokens before routing protected `/api/**` requests.
- Gateway strips spoofed identity headers and injects trusted downstream headers.
- Refresh tokens are randomly generated, hashed before persistence, rotated on refresh, and revoked on logout.
- Access tokens are blacklisted in Redis on logout until their original expiry.

## Deployment

Local development uses Docker Compose. Kubernetes deployment assets include raw Kustomize manifests plus a Helm chart with local, staging, and production values. `deploy/gitops/argocd-application.yaml` shows the GitOps path for Argo CD.

## Observability

- Every service exposes Actuator health and Prometheus metrics.
- Metrics include the `application` tag.
- Trace/span ids are included in log patterns.
- OTLP traces are exported to OpenTelemetry Collector and then Tempo.
- Grafana dashboard is provisioned under `infra/grafana/dashboards`.
- Code assessment metrics cover grading failures, review backlog, risk flags, runner requests, and runner latency.

# DevHire Cloud Architecture Notes

DevHire Cloud is a Java Spring Boot microservices recruitment platform for portfolio use.

## Service Boundaries

- `api-gateway`: public ingress, JWT validation, routing, CORS, correlation id, and Redis rate limiting.
- `auth-service`: identity, JWT access tokens, refresh token rotation, logout, Redis access-token blacklist, and demo users.
- `user-service`: candidate and employer profile APIs.
- `company-service`: employer company onboarding and admin approval/rejection.
- `job-service`: job posting workflow, OpenSearch-backed published job search, and PostgreSQL fallback search.
- `application-service`: candidate applications, duplicate prevention, status workflow, and status history.
- `notification-service`: internal notification persistence from application events and optional SMTP email delivery after resolving recipient email from `user-service`.
- `audit-service`: audit event ingestion and admin audit log search.
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

Services do not share JPA entities and do not read another service's database.

## Communication

- External calls enter through `api-gateway` on port `8080`.
- Synchronous service-to-service queries use OpenFeign:
  - `job-service` calls `company-service` for approved company ownership.
  - `application-service` calls `job-service` for published job and employer ownership facts.
- Asynchronous communication uses Kafka topics:
  - `audit.events`
  - `application.events`
  - `job.events`
  - `company.events`
  - `notification.events`

## Security

- Auth-service signs JWT access tokens with `JWT_SECRET`.
- Gateway validates access tokens before routing protected `/api/**` requests.
- Gateway strips spoofed identity headers and injects trusted downstream headers.
- Refresh tokens are randomly generated, hashed before persistence, rotated on refresh, and revoked on logout.
- Access tokens are blacklisted in Redis on logout until their original expiry.

## Observability

- Every service exposes Actuator health and Prometheus metrics.
- Metrics include the `application` tag.
- Trace/span ids are included in log patterns.
- OTLP traces are exported to OpenTelemetry Collector and then Tempo.
- Grafana dashboard is provisioned under `infra/grafana/dashboards`.

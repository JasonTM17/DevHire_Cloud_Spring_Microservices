# Production Readiness Notes

DevHire Cloud is a portfolio system, but it intentionally models the checklist a production engineer would expect before handing a platform to another team.

For the deliberately transparent list of what is still not proven in a live production environment, see [remaining gaps and roadmap](remaining-gaps-and-roadmap.md).

## Runtime

- Every backend service exposes `/actuator/health`, readiness/liveness probes, and `/actuator/prometheus`.
- Docker images are multi-stage and run as non-root users.
- Docker Compose has PostgreSQL, Redis, Kafka, OpenSearch, Prometheus, Grafana, Loki, Tempo, OpenTelemetry Collector, services, and frontend.
- Kubernetes and Helm manifests include probes, resources, HPA, PDB, NetworkPolicy, and secret references.

## Data

- Each service owns a separate database.
- Flyway handles schema and seed data.
- Important uniqueness rules are enforced at database level.
- Application status changes are transactional and retain history.
- Outbox tables protect event publishing from partial failures.

## Security

- Passwords are hashed with BCrypt.
- Access tokens are short-lived JWTs.
- Refresh tokens rotate and can be revoked.
- Gateway strips spoofed identity headers before validating JWT.
- Secrets are environment-driven and excluded by `.gitignore`.
- CI scans for secrets and vulnerable dependencies.

## Observability

- Trace IDs flow through errors and logs.
- Prometheus alert rules cover error rate, latency, service availability, JVM pressure, search latency, and outbox failures.
- Grafana dashboards are provisioned from repository files.

## Delivery

- CI validates backend, frontend, Docker builds, security, Terraform, smoke flows, performance smoke, and browser E2E.
- Release images can be published to GHCR on tag.
- AWS Terraform is blueprint-safe and does not auto-apply in CI.

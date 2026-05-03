# DevHire Cloud Knowledge Pack

DevHire Cloud is a Java 21 Spring Boot 3.5 microservices recruitment platform. It includes API Gateway, auth, user, company, job, application, notification, audit, search, observability, CI/CD, Docker, Kubernetes, Helm, Terraform, and frontend workflows.

The main business flow is employer company onboarding, admin company approval, employer job submission, admin job approval, candidate job search, candidate application submission, employer status update, candidate notification, and admin audit review.

Production signals include JWT security, refresh token rotation, Redis blacklist, PostgreSQL service-owned databases, Flyway migrations, Kafka transactional outbox, idempotent consumers, OpenSearch job search, Prometheus metrics, Grafana dashboards, OpenTelemetry traces, Loki logs, Docker Compose, Helm, Argo CD, AWS Terraform blueprint, Trivy, Gitleaks, SBOM, Testcontainers, Playwright, and k6 smoke tests.

The 10-minute demo starts Docker Compose, opens the frontend, shows the jobs page, logs in as candidate, employer, and admin, then ends with Grafana and repository documentation.

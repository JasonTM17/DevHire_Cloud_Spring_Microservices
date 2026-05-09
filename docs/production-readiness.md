# Production Readiness Notes

DevHire Cloud is a portfolio system, not a live customer SaaS. The readiness goal is therefore precise: make every production-shaped claim inspectable, repeatable, and scoped. This page summarizes what is already engineered, how it is verified, and what is intentionally not claimed.

For the transparent list of remaining real-production gaps, see [remaining gaps and roadmap](remaining-gaps-and-roadmap.md).

## Readiness Ledger

| Area | Implemented posture | Verification |
|---|---|---|
| Runtime health | Every backend service exposes `/actuator/health`, readiness/liveness probes, and `/actuator/prometheus`. | `mvn -T1 verify`, `docker compose config --quiet`, runtime smoke scripts |
| Container runtime | Multi-stage images run as non-root users and carry OCI metadata. | Docker workflow, [container images](container-images.md), Trivy image scans |
| Local platform | Docker Compose includes PostgreSQL, Redis, Kafka, OpenSearch, Prometheus, Grafana, Loki, Tempo, OpenTelemetry Collector, backend services, and frontend. | `docker compose up -d --build`, `portfolio-verify.ps1 -Runtime` |
| Code assessment isolation | `application-service` owns assignments, hidden tests, scoring, audit, and review; `assessment-runner-service` owns isolated execution adapter behavior. | [code assessment reviewer proof](code-assessment-reviewer-proof.md), focused service tests |
| Kubernetes posture | Raw manifests and Helm values include probes, resources, HPA, PDB, NetworkPolicy, and secret references. | `cloud-verify.ps1`, `kubectl kustomize deploy/k8s` |
| AWS posture | Terraform is apply-ready blueprint validation, not an unverified production claim. | `terraform-validate.ps1`, [cloud readiness review](cloud-readiness-review.md) |

## Data and Events

| Control | Posture |
|---|---|
| Service ownership | Each business service owns its own database/schema and Flyway migrations. |
| Transaction boundaries | Application state changes are transactional and preserve status history. |
| Database invariants | Important uniqueness and score/hash/version constraints are enforced at database level. |
| Event reliability | Outbox tables protect event publishing from partial failures; consumers are idempotent. |
| Demo data | Deterministic seed data supports reviewer flows without real customer data. |

## Security

| Control | Posture |
|---|---|
| Identity | BCrypt passwords, short-lived JWT access tokens, refresh-token rotation, and revocation. |
| Authorization | Role checks protect candidate, employer, and admin/ops routes; non-admin users cannot open Admin/Ops direct routes. |
| Gateway hardening | The gateway strips spoofed identity headers before validating JWT. |
| Secret handling | Secrets are environment-driven, ignored by repository hygiene checks, and never required for deterministic local fallback paths. |
| Supply chain | CI runs Gitleaks, dependency review, CodeQL, SBOM generation, Trivy filesystem scans, and Trivy image scans. |

## Observability

| Signal | Posture |
|---|---|
| Tracing | Trace IDs flow through errors and logs. |
| Metrics | Actuator and domain metrics cover gateway, recruitment, notification, audit, outbox, search, AI, and code assessment. |
| Alerts | Prometheus rules cover error rate, latency, availability, JVM pressure, search latency, outbox failures, AI provider behavior, runner health, grading latency, and review risk. |
| Dashboards | Grafana dashboards are provisioned from repository files and include Gateway, service health, data capacity, outbox, search/AI, and code assessment runner health. |

## Delivery

| Gate | Posture |
|---|---|
| Backend | Maven verification and focused service tests. |
| Frontend | TypeScript, production build, Playwright route matrix, mobile overflow checks, and Stitch pixel-diff evidence. |
| Docker | Matrix builds for services and frontend, OCI labels, SBOM/provenance, GHCR canonical registry, Docker Hub mirror support. |
| Cloud | Helm/raw Kubernetes/Terraform validation without automatic cloud apply. |
| Governance | Protected `master`, PR-based flow, branch protection documented, docs quality and evidence audits. |

## Explicit Non-Claims

- No live customer traffic is claimed.
- No external penetration test is claimed.
- No production AWS account is claimed unless a credentialed deployment phase is run.
- No webcam or screen-lock proctoring is claimed; code assessment anti-cheat focuses on server-owned scoring, hidden tests, runner isolation, audit metadata, integrity signals, and similarity posture.

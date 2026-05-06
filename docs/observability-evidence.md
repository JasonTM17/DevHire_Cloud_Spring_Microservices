# Observability Evidence

DevHire Cloud treats observability as reviewable source code, not as a decorative screenshot. The Prometheus and Grafana evidence in the README is generated from repository-owned configuration so reviewers can inspect the same rules and dashboard panels that the Docker stack provisions.

## Evidence Sources

| Evidence | Source | Generated Screenshot |
|---|---|---|
| Prometheus alert rules | `infra/prometheus/rules/devhire-slo.yml` | `docs/screenshots/ops-prometheus-rules.png` |
| Grafana SLO dashboard | `infra/grafana/dashboards/devhire-slo-overview.json` | `docs/screenshots/ops-grafana-slo.png` |
| Domain dashboards | `infra/grafana/dashboards/devhire-*.json` | Verified by `scripts/observability-catalog-verify.ps1` |
| Runtime domain metrics | `scripts/runtime-observability-smoke.ps1` | Scrapes service `/actuator/prometheus` endpoints when Docker is running |
| Prometheus scrape config | `infra/prometheus/prometheus.yml` | Verified by `promtool` and Docker Compose config |
| Grafana provisioning | `infra/grafana/provisioning/` | Loaded by the local Docker stack |

The screenshots are rendered through Playwright using `frontend/e2e/ops-evidence-render.spec.ts`. They intentionally do not depend on a live Grafana page being populated with recent data. That avoids the common portfolio smell where a screenshot shows a blank dashboard or loading skeleton and still claims production observability.

## Current SLO Coverage

Prometheus rules currently cover:

- Gateway 5xx rate.
- Gateway p95 latency.
- Gateway route p95 latency and rate-limit spikes.
- Service scrape/down state.
- JVM heap pressure.
- Database connection pool saturation.
- Job search p95 latency.
- Outbox publish failures.
- Outbox backlog.
- Email retry backlog.
- Search fallback spikes.
- AI assistant p95 latency.
- AI fallback spike.
- AI provider circuit breaker open state.
- AI service 5xx rate.

Grafana panels currently cover:

- Gateway availability.
- Gateway p95 latency.
- Request rate.
- 5xx error rate.
- Recruitment funnel and application status transitions.
- Notification delivery and email state distribution.
- Event reliability and outbox backlog.
- Job search p95 latency.
- Search adapter behavior and AI provider behavior.
- Service readiness scrape.
- JVM heap pressure.
- Database pool pressure.
- Outbox publish failures.
- AI assistant request rate.
- AI assistant p95 latency.
- AI tool calls and fallback count.

## Domain Metric Catalog

The reviewer-facing observability gate checks that domain metrics are represented in at least one of the alert rules, Grafana dashboards, or runtime smoke assertions. The catalog includes:

| Area | Metrics |
|---|---|
| Gateway | `devhire_gateway_requests_total`, `devhire_gateway_request_latency_seconds`, `devhire_gateway_rate_limited_total` |
| Recruitment funnel | `devhire_applications_total`, `devhire_application_status_transitions_total` |
| Notification delivery | `devhire_notifications_total`, `devhire_email_delivery_total` |
| Event reliability | `devhire_outbox_backlog`, `devhire_outbox_publish_failure_total` |
| Audit | `devhire_audit_ingested_total` |
| Search | `devhire_job_search_requests_total`, `devhire_job_search_latency_seconds` |
| AI assistant | `devhire_ai_conversations_total`, `devhire_ai_usage_events_total`, `devhire_ai_fallback_total`, `devhire_ai_chat_latency_seconds`, `devhire_ai_provider_circuit_open` |
| Runtime capacity | `hikaricp_connections_active`, `hikaricp_connections_max`, `jvm_memory_used_bytes` |

## Regeneration

Regenerate the observability evidence screenshots:

```powershell
cd frontend
npm run screenshots:ops-evidence
```

Run the visual quality gate:

```powershell
.\scripts\visual-evidence-audit.ps1
```

The audit fails if the two operations screenshots are missing, too small, or too low-resolution. This prevents blank or loading-state images from quietly returning to the README.

## Validation

Static validation:

```powershell
.\scripts\portfolio-verify.ps1 -Docs -Docker
```

Observability catalog validation:

```powershell
.\scripts\observability-catalog-verify.ps1
```

Prometheus config validation:

```powershell
docker run --rm -v "${PWD}/infra/prometheus:/etc/prometheus" prom/prometheus:v3.0.1 promtool check config /etc/prometheus/prometheus.yml
```

Runtime validation when Docker is available:

```powershell
docker compose up -d --build
.\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl http://localhost:8080
```

## Review Guidance

A senior reviewer should check both the visual evidence and the source files behind it:

1. Open `docs/screenshots/ops-prometheus-rules.png`.
2. Open `infra/prometheus/rules/devhire-slo.yml`.
3. Confirm the alert names, severities, durations, and PromQL match.
4. Open `docs/screenshots/ops-grafana-slo.png`.
5. Open `infra/grafana/dashboards/devhire-slo-overview.json`.
6. Confirm the dashboard includes availability, latency, traffic, error, JVM, outbox, search, and AI provider panels.

This gives a more honest signal than a live screenshot alone: the repository proves what would be provisioned, while runtime smoke proves the stack can run.

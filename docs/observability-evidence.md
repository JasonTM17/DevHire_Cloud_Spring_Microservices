# Observability Evidence

DevHire Cloud treats observability as reviewable source code, not as a decorative screenshot. The Prometheus and Grafana evidence in the README is generated from repository-owned configuration so reviewers can inspect the same rules and dashboard panels that the Docker stack provisions.

## Evidence Sources

| Evidence | Source | Generated Screenshot |
|---|---|---|
| Prometheus alert rules | `infra/prometheus/rules/devhire-slo.yml` | `docs/screenshots/ops-prometheus-rules.png` |
| Grafana SLO dashboard | `infra/grafana/dashboards/devhire-slo-overview.json` | `docs/screenshots/ops-grafana-slo.png` |
| Prometheus scrape config | `infra/prometheus/prometheus.yml` | Verified by `promtool` and Docker Compose config |
| Grafana provisioning | `infra/grafana/provisioning/` | Loaded by the local Docker stack |

The screenshots are rendered through Playwright using `frontend/e2e/ops-evidence-render.spec.ts`. They intentionally do not depend on a live Grafana page being populated with recent data. That avoids the common portfolio smell where a screenshot shows a blank dashboard or loading skeleton and still claims production observability.

## Current SLO Coverage

Prometheus rules currently cover:

- Gateway 5xx rate.
- Gateway p95 latency.
- Service scrape/down state.
- JVM heap pressure.
- Job search p95 latency.
- Outbox publish failures.
- AI assistant p95 latency.
- AI fallback spike.
- AI provider circuit breaker open state.
- AI service 5xx rate.

Grafana panels currently cover:

- Gateway availability.
- Gateway p95 latency.
- Request rate.
- 5xx error rate.
- Job search p95 latency.
- Service readiness scrape.
- JVM heap pressure.
- Outbox publish failures.
- AI assistant request rate.
- AI assistant p95 latency.
- AI tool calls and fallback count.

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

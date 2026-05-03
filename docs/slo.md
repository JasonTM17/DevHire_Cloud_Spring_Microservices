# DevHire Cloud SLO And Operations Runbook

DevHire Cloud uses Prometheus, Grafana, Micrometer, OpenTelemetry, Loki, and Tempo to make local and production operations reviewable. The SLOs below are intentionally portfolio-friendly: they are realistic for a small recruitment platform and map directly to alert rules and dashboard panels in this repository.

## Service Level Objectives

| Area | SLO | Measurement |
| --- | --- | --- |
| Gateway availability | 99.5% successful requests over 30 days | `1 - 5xx / all gateway requests` |
| Gateway latency | p95 below 1 second over 5 minutes | `http_server_requests_seconds_bucket` for `api-gateway` |
| Job search latency | p95 below 750 ms over 5 minutes | `http_server_requests_seconds_bucket` for `job-service` URI `/jobs` |
| AI assistant latency | p95 below 5 seconds over 5 minutes | `devhire_ai_chat_latency_seconds_bucket` |
| AI assistant provider fallback | Fewer than 5 fallback answers over 15 minutes in non-demo environments | `devhire_ai_fallback_total` |
| Service health | All service scrape targets available | Prometheus `up{job="devhire-services"}` |
| Event reliability | Zero outbox publish failures for 10 minutes | `devhire_outbox_publish_failure_total` |
| JVM capacity | Heap pressure below 85% for normal traffic | `jvm_memory_used_bytes / jvm_memory_max_bytes` |

## Error Budget

For 99.5% monthly availability, the allowed monthly unavailability budget is roughly 3.6 hours.

Use the budget to decide incident severity:

- Less than 25% burned: continue normal delivery.
- 25% to 50% burned: review risky releases and increase monitoring.
- 50% to 75% burned: pause non-critical releases until the root cause is understood.
- Above 75% burned: freeze feature releases and prioritize reliability work.

## Alerts

Prometheus alert rules live in `infra/prometheus/rules/devhire-slo.yml`.

Current alerts:

- `DevHireGatewayHigh5xxRate`
- `DevHireGatewayP95LatencyHigh`
- `DevHireServiceDown`
- `DevHireJvmHeapPressureHigh`
- `DevHireJobSearchP95LatencyHigh`
- `DevHireOutboxPublishFailures`
- `DevHireAiP95LatencyHigh`
- `DevHireAiFallbackSpike`
- `DevHireAiHigh5xxRate`

Validate the rules locally:

```powershell
docker run --rm -v "${PWD}/infra/prometheus:/etc/prometheus" prom/prometheus:v3.0.1 promtool check config /etc/prometheus/prometheus.yml
```

## Dashboard

Grafana provisions `infra/grafana/dashboards/devhire-slo-overview.json` automatically under the `DevHire Cloud` folder.

Local URLs after `docker compose up --build`:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`
- Grafana login: `admin/admin`
- Tempo: `http://localhost:3200`
- Loki: `http://localhost:3100`

The SLO dashboard includes:

- Gateway availability.
- Gateway p95 latency.
- Request rate.
- 5xx error rate.
- Job search p95 latency.
- Service scrape health.
- JVM heap pressure.
- Outbox publish failures.
- AI assistant request rate.
- AI assistant p95 latency.
- AI tool calls and Claude fallback count.

AI assistant metrics are emitted by `ai-service`:

- `devhire_ai_chat_requests_total`
- `devhire_ai_chat_latency_seconds_bucket`
- `devhire_ai_fallback_total`
- `devhire_ai_tool_calls_total`
- `devhire_ai_token_estimate`

Every chat request also emits audit/outbox activity:

- `AI_CHAT_REQUESTED`
- `AI_TOOL_EXECUTED`
- `AI_FALLBACK_USED`
- `AI_KNOWLEDGE_REINDEXED`

## Incident Triage

1. Open the SLO dashboard and identify the burning SLO.
2. Check whether the alert is isolated to one service or system-wide.
3. Inspect the latest deployment SHA, container restarts, and service health endpoints.
4. Use Tempo traces for slow or failing request paths.
5. Use Loki logs with trace id/correlation id for the impacted service.
6. If `DevHireOutboxPublishFailures` fires, inspect Kafka availability and the service `outbox_events` table for `FAILED` or `DEAD_LETTER` rows.
7. Roll back the newest deployment if the failure correlates with a release.

## Review Commands

```powershell
mvn -T1 clean verify
docker compose config --quiet
docker run --rm -v "${PWD}/infra/prometheus:/etc/prometheus" prom/prometheus:v3.0.1 promtool check config /etc/prometheus/prometheus.yml
```

Runtime smoke after starting the stack:

```powershell
scripts/api-smoke.ps1 -GatewayUrl http://localhost:8080
scripts/perf-smoke.ps1 -BaseUrl http://localhost:8080 -Vus 2 -Duration 10s -UseDocker
```

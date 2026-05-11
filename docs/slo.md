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
| AI provider circuit health | Circuit breaker should remain closed outside provider incidents | `devhire_ai_provider_circuit_open` |
| Code assessment grading reliability | Zero grading failures for 10 minutes | `devhire_code_grading_requests_total{status="failure"}` |
| Code assessment review backlog | Submitted or reviewed assessments should stay below 20 for 30 minutes | `devhire_code_assessments{status=~"SUBMITTED|REVIEWED|AUTO_REVIEWED"}` |
| Code assessment safety | Risk-flag backlog should stay below 10 submissions for 30 minutes | `devhire_code_review_risk_flags{type="any"}` |
| Code grading latency | p95 below 1 second over 5 minutes | `devhire_code_grading_latency_seconds_bucket` |
| Assessment runner health | Runner requests should complete without compile spikes, timeouts, unavailable verdicts, policy failures, client failures, or fail-closed configuration drift during normal assessment flow | `devhire_assessment_runner_requests_total{status,verdict}`, `devhire_assessment_runner_sandbox_failures_total`, `devhire_code_runner_client_failures_total`, `/internal/assessment-runs/health` |
| Recruitment funnel visibility | Application status metrics should be non-empty in seeded/runtime demos | `devhire_applications`, `devhire_application_status_transitions` |
| Notification delivery backlog | Retryable email failures should stay below 25 rows for 30 minutes | `devhire_email_delivery{status="FAILED_RETRYABLE"}` |
| Outbox backlog | Pending/failed/dead-letter backlog should stay below 50 rows per service | `devhire_outbox_backlog` |
| Service health | All service scrape targets available | Prometheus `up{job="devhire-services"}` |
| Event reliability | Zero outbox publish failures for 10 minutes | `devhire_outbox_publish_failure_total` |
| Database pool capacity | Active pool usage should stay below 85% | `hikaricp_connections_active / hikaricp_connections_max` |
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
- `DevHireOutboxBacklogHigh`
- `DevHireEmailRetryBacklogHigh`
- `DevHireSearchFallbackSpike`
- `DevHireDbPoolSaturation`
- `DevHireAiP95LatencyHigh`
- `DevHireAiFallbackSpike`
- `DevHireAiProviderCircuitOpen`
- `DevHireAiHigh5xxRate`
- `DevHireCodeGradingFailures`
- `DevHireCodeAssessmentReviewBacklogHigh`
- `DevHireCodeRiskFlagBacklogHigh`
- `DevHireCodeGradingLatencyHigh`
- `DevHireAssessmentRunnerUnavailableSpike`
- `DevHireAssessmentRunnerFailClosed`
- `DevHireAssessmentRunnerCompileErrorSpike`
- `DevHireAssessmentRunnerTimeoutSpike`
- `DevHireAssessmentRunnerPolicyBlockedSpike`
- `DevHireAssessmentRunnerQueueDepthHigh`
- `DevHireAssessmentRunnerLatencyHigh`
- `DevHireAssessmentRunnerSandboxFailures`
- `DevHireCodeRunnerClientFailures`

Validate the rules locally:

```powershell
docker run --rm -v "${PWD}/infra/prometheus:/etc/prometheus" prom/prometheus:v3.0.1 promtool check config /etc/prometheus/prometheus.yml
```

## Dashboard

Grafana provisions all JSON dashboards in `infra/grafana/dashboards/` automatically under the `DevHire Cloud` folder.

Local URLs after `docker compose up --build`:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`
- Grafana login: `admin/admin`
- Tempo: `http://localhost:3200`
- Loki: `http://localhost:3100`

The dashboard pack includes:

- Gateway availability.
- Gateway p95 latency.
- Request rate.
- 5xx error rate.
- Job search p95 latency, request counts, and fallback status.
- Service scrape health.
- JVM heap pressure.
- DB pool pressure.
- Application status funnel and transition history.
- Notification read/email delivery state.
- Outbox backlog and publish failures.
- Audit action distribution.
- AI assistant request rate, p95 latency, usage rows, tool calls, and Claude fallback count.
- Code assessment queue, submission status, risk flags, employer decisions, grading p95 latency, accepted/compile-error/timeout/unavailable runner verdict rates, queue depth, sandbox failures, and runner client failures.

The README operations screenshots for Prometheus and Grafana are rendered from the same repository-owned configuration instead of from a potentially empty live UI page. See [observability evidence](observability-evidence.md) for the screenshot generation and quality-gate policy.

AI assistant metrics are emitted by `ai-service`:

- `devhire_ai_chat_requests_total`
- `devhire_ai_chat_latency_seconds_bucket`
- `devhire_ai_fallback_total`
- `devhire_ai_tool_calls_total`
- `devhire_ai_token_estimate`
- `devhire_ai_provider_failures_total`
- `devhire_ai_provider_circuit_open`
- `devhire_ai_provider_circuit_opened_total`
- `devhire_ai_conversations`
- `devhire_ai_usage_events`

Code assessment metrics are emitted by `application-service` and `assessment-runner-service`:

- `devhire_code_assessments{status}`
- `devhire_code_submissions{language,status}`
- `devhire_code_grading_requests_total{language,status}`
- `devhire_code_grading_latency_seconds_bucket`
- `devhire_code_grading_score`
- `devhire_code_review_risk_flags{type}`
- `devhire_code_review_decisions_total{decision,status}`
- `devhire_code_runner_client_failures_total{language}`
- `devhire_assessment_runner_requests_total{language,status,verdict}`
- `devhire_assessment_runner_latency_seconds_bucket`
- `devhire_assessment_runner_queue_depth`
- `devhire_assessment_runner_sandbox_failures_total{reason}`

Recruitment domain metrics are emitted by service-owned modules:

- `devhire_applications{status}`
- `devhire_application_status_transitions{from,to}`
- `devhire_notifications{type,read}`
- `devhire_email_delivery{status}`
- `devhire_outbox_backlog{service,status}`
- `devhire_audit_ingested{action}`
- `devhire_job_search_requests_total{adapter,status}`
- `devhire_job_search_latency_seconds_bucket`

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
7. If `DevHireAiProviderCircuitOpen` fires, check admin AI provider diagnostics, Anthropic key/configuration, outbound network policy, and recent provider errors.
8. If a code assessment alert fires, follow the [code assessment runner runbook](runbooks/code-assessment-runner.md), check `application-service`, `assessment-runner-service`, `/internal/assessment-runs/health`, hidden-case migration data, challenge publish state, wrong-answer/compile-error/timeout/policy/unavailable rates, runner client failures, and `/admin` assessment health before trusting candidate scores.
9. Roll back the newest deployment if the failure correlates with a release.

## Review Commands

```powershell
mvn -T1 clean verify
docker compose config --quiet
docker run --rm -v "${PWD}/infra/prometheus:/etc/prometheus" prom/prometheus:v3.0.1 promtool check config /etc/prometheus/prometheus.yml
```

Runtime smoke after starting the stack:

```powershell
scripts/api-smoke.ps1 -GatewayUrl http://localhost:8080
scripts/code-assessment-smoke.ps1 -GatewayUrl http://localhost:8080
scripts/perf-smoke.ps1 -BaseUrl http://localhost:8080 -Vus 2 -Duration 10s -UseDocker
scripts/runtime-observability-smoke.ps1 -GatewayUrl http://localhost:8080
```

Regenerate and validate operations screenshots:

```powershell
cd frontend
npm run screenshots:ops-evidence
cd ..
.\scripts\visual-evidence-audit.ps1
```

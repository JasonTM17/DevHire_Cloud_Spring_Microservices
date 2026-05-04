# Runbook: Alert Response

## Scope

Use this runbook when Prometheus or Grafana reports Gateway 5xx burn, high p95 latency, service down, JVM memory pressure, Kafka lag, outbox failures, or AI provider fallback spikes.

## Triage

1. Open Grafana `DevHire Cloud SLO Overview`.
2. Check the affected service health endpoint:

```powershell
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/prometheus
```

3. Inspect recent logs:

```powershell
docker compose logs --tail=200 api-gateway
docker compose logs --tail=200 job-service
docker compose logs --tail=200 application-service
```

4. Confirm whether the error is edge-only, service-specific, database-related, Kafka-related, OpenSearch-related, SMTP-related, or AI-provider-related.

## Mitigation

- Gateway 5xx: restart the failing service, verify downstream URL env vars, and check JWT/filter errors.
- High latency: reduce load, inspect database/OpenSearch latency, and confirm Kafka consumers are not blocking request threads.
- Service down: inspect container health and last migration logs.
- JVM memory pressure: restart the service, reduce local Docker stack load, and review heap flags before production rollout.
- Error budget burn: pause non-essential releases and run the matching service runbook.

## Verification

```powershell
docker compose ps
.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080
.\scripts\openapi-verify.ps1 -GatewayUrl http://localhost:8080
```

## Prevention

- Keep alert rules in `infra/prometheus/rules/`.
- Keep dashboard evidence in `infra/grafana/dashboards/`.
- Run `.\scripts\perf-suite.ps1` and `.\scripts\chaos-smoke.ps1` before a release.


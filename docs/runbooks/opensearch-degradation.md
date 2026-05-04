# Runbook: OpenSearch Degradation

## Scope

Use this when OpenSearch is unhealthy, search latency is high, or job search results are missing from the search index.

## Signals

- OpenSearch health endpoint fails.
- Job search p95 exceeds SLO.
- Job-service logs show OpenSearch errors.
- UI shows fallback search behavior.

## Triage

```powershell
curl http://localhost:9200/_cluster/health
docker compose logs --tail=200 opensearch
docker compose logs --tail=200 job-service
```

Confirm whether the issue is cluster health, index mapping, indexing lag, or query failure.

## Mitigation

- If OpenSearch is down, keep the platform available through PostgreSQL search fallback.
- If index mapping is broken, create a migration/reindex plan rather than changing mapping manually in production.
- If query latency is high, reduce expensive filters, inspect heap pressure, and scale OpenSearch before increasing request timeouts.
- If only data is stale, run the documented reindex process.

## Verification

```powershell
.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080
.\scripts\chaos-smoke.ps1 -GatewayUrl http://localhost:8080 -Scenario opensearch -Recover
```

Expected result: `GET /api/jobs` still returns paginated published jobs even when OpenSearch is unavailable.


# Runbook: AI Provider Outage

## Scope

Use this when Anthropic Claude is unavailable, the API key is missing, provider latency is high, or the AI provider circuit breaker is open.

## Signals

- `GET /api/admin/ai/provider/status` reports `CIRCUIT_OPEN_FALLBACK` or `DEMO_FALLBACK`.
- `devhire.ai.fallback.total` increases.
- Assistant UI shows fallback badge.
- Provider failures counter increases.

## Triage

```powershell
curl http://localhost:8088/actuator/health
docker compose logs --tail=200 ai-service
.\scripts\ai-eval.ps1 -GatewayUrl http://localhost:8080
```

Check whether `ANTHROPIC_API_KEY` is configured in the intended environment and confirm no key value is printed in logs or docs.

## Mitigation

- Leave deterministic fallback enabled for demos and incident continuity.
- Do not bypass the prompt-injection guard.
- If provider credentials failed, rotate the key in the secret store and restart only `ai-service`.
- If provider is rate limited, reduce traffic and keep suggested prompts available in fallback mode.

## Verification

```powershell
.\scripts\ai-eval.ps1 -GatewayUrl http://localhost:8080
```

Expected result: answers contain citations and tool traces even without a live provider key.


# AI Assistant Evaluation Gate

DevHire Cloud treats the Claude Haiku assistant as a production portfolio feature, so the assistant has a lightweight evaluation gate instead of relying on manual clicking only.

## What The Gate Checks

The evaluation pack lives at `docs/ai/eval-prompts.json`.

Each prompt verifies:

- the assistant returns a non-empty answer through API Gateway;
- expected portfolio terms are present;
- at least one citation is returned;
- at least one tool trace is returned;
- prompt injection and secret-exfiltration attempts return a safety answer instead of provider output;
- the provider diagnostics endpoint is reachable for an admin user;
- the diagnostics response includes safe circuit breaker state.

The gate intentionally works without a real Anthropic key. When `ANTHROPIC_API_KEY` is absent, `ai-service` runs in deterministic demo fallback mode and still proves the RAG, citation, tool trace, auth, persistence, and gateway path.

## Local Usage

Run against an already running stack:

```powershell
./scripts/ai-eval.ps1 -GatewayUrl http://localhost:8080
```

Run an isolated high-port stack, build images, evaluate, and stop afterwards:

```powershell
./scripts/ai-eval.ps1 -StartStack -Build -GatewayUrl http://localhost:18080
```

Keep the isolated stack running for browser inspection:

```powershell
./scripts/ai-eval.ps1 -StartStack -Build -KeepRunning -GatewayUrl http://localhost:18080
```

The summary is written to `reports/ai/eval-summary.json`, which is intentionally ignored by Git.

## CI Workflow

`.github/workflows/ai-eval.yml` runs on a weekly schedule and can also be triggered manually. It performs:

1. `docker compose config --quiet`
2. `./scripts/ai-eval.ps1 -StartStack -Build -GatewayUrl http://localhost:18080`
3. upload of the JSON evaluation summary
4. upload of Docker Compose logs when the gate fails

This keeps pull requests fast while still giving the repository a recurring assistant regression signal.

## Provider Diagnostics

Admins can check safe provider configuration through:

```http
GET /api/admin/ai/provider/status
Authorization: Bearer <admin-access-token>
```

The response includes provider, model, base URL host, Anthropic API version, token cap, fallback flag, runtime mode, and circuit breaker state. It never returns the API key or raw secret values.

Example:

```json
{
  "provider": "anthropic",
  "model": "claude-haiku-4-5-20251001",
  "baseUrlHost": "api.anthropic.com",
  "anthropicVersion": "2023-06-01",
  "maxTokens": 900,
  "apiKeyConfigured": false,
  "demoFallbackEnabled": true,
  "mode": "DEMO_FALLBACK",
  "circuitBreakerState": "CLOSED",
  "consecutiveFailures": 0
}
```

## Extending The Evaluation Set

Add prompts when the assistant gains new tools or knowledge sources. Keep prompts recruiter-friendly and deterministic enough to run in fallback mode. Avoid assertions on exact prose; assert on stable facts, citations, and tool traces.

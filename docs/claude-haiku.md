# Claude Haiku Provider Configuration

DevHire Cloud defaults the AI assistant to Anthropic Claude Haiku for a cost-conscious portfolio demo.

## Environment Variables

```dotenv
ANTHROPIC_API_KEY=
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
ANTHROPIC_MAX_TOKENS=900
DEVHIRE_AI_DEMO_FALLBACK_ENABLED=true
```

`.env.example` documents placeholders only. Real values must stay outside Git.

## Runtime Behavior

1. `ai-service` receives an authenticated request through Gateway.
2. It retrieves local knowledge chunks and tool context.
3. If `ANTHROPIC_API_KEY` exists, it calls the Anthropic Messages API.
4. If the key is missing or the provider fails and fallback is enabled, it returns a deterministic portfolio answer.
5. It persists messages, usage, metrics, and audit/outbox events.

Admins can verify safe runtime state with:

```http
GET /api/admin/ai/provider/status
```

The endpoint reports provider, model, base URL host, API version, max token cap, fallback setting, and mode. It never returns the raw key.

## Cost Guardrails

- Default model is Haiku.
- `ANTHROPIC_MAX_TOKENS` is intentionally low for demos.
- CI uses mock/fallback behavior.
- Manual provider smoke should be opt-in only.
- Token estimates are exposed through Micrometer summaries for reviewer visibility.
- `scripts/ai-eval.ps1` runs the assistant through Gateway in fallback mode by default, so CI can catch regressions without paid provider calls.

## Production Upgrade Path

- Store the key in AWS Secrets Manager and inject it through External Secrets or the platform secret store.
- Add provider circuit breaker and provider-specific retry policy.
- Add prompt evaluation fixtures for regression testing.
- Add redaction middleware for sensitive prompt/context fields.
- Add a manual GitHub Actions smoke workflow that only runs when `ANTHROPIC_API_KEY` is present.

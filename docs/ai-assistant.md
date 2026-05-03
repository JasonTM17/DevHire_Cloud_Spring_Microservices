# Claude AI Assistant

DevHire Cloud includes `ai-service`, a recruiter-facing AI assistant for explaining the platform, finding jobs, walking through the demo flow, and summarizing production readiness.

The service is designed as a safe portfolio feature:

- It is protected by API Gateway JWT validation.
- It stores conversations in its own PostgreSQL database, `devhire_ai`.
- It uses Anthropic Claude Haiku only when `ANTHROPIC_API_KEY` is provided through environment or secret stores.
- It falls back to a deterministic portfolio answer when no API key is configured and fallback is enabled.
- CI and local smoke tests never require a real Anthropic key.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/ai/chat` | Non-streaming assistant answer |
| `POST` | `/api/ai/chat/stream` | Server-sent events streaming answer |
| `GET` | `/api/ai/conversations` | List current user's conversations |
| `GET` | `/api/ai/conversations/{id}` | Read conversation messages |
| `DELETE` | `/api/ai/conversations/{id}` | Delete current user's conversation |
| `POST` | `/api/admin/ai/knowledge/reindex` | Rebuild local knowledge chunks |

## RAG Sources

- Curated platform knowledge from docs and ADRs.
- Published job context through `job-service`.
- Platform health snapshot.

The retrieval boundary is intentionally clear so a future version can replace PostgreSQL full-text chunks with OpenSearch, Elasticsearch, pgvector, or a managed vector store.

## Tool Context

The assistant exposes tool traces in the frontend:

- `search_jobs`
- `get_platform_health_snapshot`

Every tool execution emits `devhire_ai_tool_calls_total`, an `AI_TOOL_EXECUTED` audit event, and a visible trace pill in `/assistant`.

## Observability

Prometheus metrics:

- `devhire_ai_chat_requests_total`
- `devhire_ai_chat_latency_seconds_bucket`
- `devhire_ai_fallback_total`
- `devhire_ai_tool_calls_total`
- `devhire_ai_token_estimate`

Audit events:

- `AI_CHAT_REQUESTED`
- `AI_TOOL_EXECUTED`
- `AI_FALLBACK_USED`
- `AI_KNOWLEDGE_REINDEXED`

Grafana panels live in `infra/grafana/dashboards/devhire-slo-overview.json`.

## Local Smoke

```powershell
docker compose up --build
./scripts/api-smoke.ps1 -GatewayUrl http://localhost:8080
```

```powershell
cd frontend
npm run e2e
```

```powershell
./scripts/portfolio-demo.ps1 -Build -ResetBefore
```

## Security Notes

- Never commit `ANTHROPIC_API_KEY`.
- Store the key in `.env`, GitHub Secrets, Kubernetes Secret, AWS Secrets Manager, or another secret manager.
- The assistant must not answer with hidden secrets, cloud credentials, tokens, or private runtime values.
- Any API key pasted into chat should be treated as compromised and rotated before use.

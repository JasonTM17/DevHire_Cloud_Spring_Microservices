# Runtime Evidence v0.4

Date: 2026-05-04

Status: passed for local Docker runtime proof.

This document is a sanitized evidence pack. Raw generated reports remain under `reports/` and are intentionally ignored because runtime smoke tools can handle temporary JWTs, API payloads, Mailpit messages, and local machine details.

## Environment

| Item | Result |
|---|---|
| Docker runtime preflight | Passed |
| Docker server | 29.4.0 |
| Docker Compose syntax | Passed |
| Stack start | `docker compose up -d --build` passed |
| Gateway URL | `http://localhost:8080` |
| Mailpit URL | `http://localhost:8025` |
| AI provider mode | `DEMO_FALLBACK`; no Anthropic API key required |

## Runtime Gate Results

| Check | Status | Evidence |
|---|---|---|
| Portfolio runtime verifier | Passed | 7 steps, 0 failures, 43.61 seconds |
| API smoke | Passed | Company approval, job publication, candidate application, notification, audit, and AI fallback through Gateway |
| Runtime reliability | Passed | 5 checks, 0 failures, including refresh rotation/logout blacklist, duplicate application rejection, notification/audit ingestion, and AI prompt-injection refusal |
| AI evaluation | Passed | 5 prompts, citations and tool traces present, demo fallback mode |
| Mailpit email smoke | Passed | Message count increased from 2 to 6 through sandbox delivery |
| OpenAPI verify | Passed | 8 services checked through live `/v3/api-docs` endpoints |
| k6 role suite | Passed | 43/43 assertions, 0% failed requests, Gateway p95 about 100ms, AI p95 about 80ms |
| Sanitized evidence summary | Passed | `runtime-evidence-summary.ps1` reported all tracked sources passing |

## Runtime URLs

- Frontend: `http://localhost:3001`
- Gateway: `http://localhost:8080`
- Mailpit: `http://localhost:8025`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000`

## Commands Executed

```powershell
.\scripts\runtime-preflight.ps1
docker compose up -d --build
.\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl http://localhost:8080
.\scripts\runtime-evidence-summary.ps1
```

## Evidence Policy

- Do not commit files from `reports/`.
- Do not copy JWTs, refresh tokens, SMTP message bodies, provider keys, or raw API payloads into committed docs.
- If runtime proof fails in another environment, update this file with the exact failing command and reason instead of claiming a pass.


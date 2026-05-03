# Verification Runner

`scripts/verify.ps1` is the single entry point for portfolio-grade local verification. It keeps the quick developer path small while still supporting a full release-style gate.

## Quick Checks

Run the default backend and docs gate:

```powershell
.\scripts\verify.ps1
```

Run docs and Docker syntax only:

```powershell
.\scripts\verify.ps1 -Docs -Docker
```

## Full Portfolio Gate

Start or refresh the stack, then run backend, frontend, smoke, infrastructure, security, and docs checks:

```powershell
.\scripts\verify.ps1 -All -StartStack
```

For a faster smoke gate during local iteration:

```powershell
.\scripts\verify.ps1 -Docker -Smoke -StartStack -SkipPerf -SkipChaos
```

For the operations smoke used in release evidence:

```powershell
.\scripts\verify.ps1 -Smoke -PerfVus 2 -PerfDuration 10s
```

## Scopes

| Flag | Checks |
|---|---|
| `-Backend` | `mvn -T1 clean verify` and coverage gate |
| `-Frontend` | `npm ci`, typecheck, production build, Playwright E2E |
| `-Docker` | `docker compose config --quiet`; with `-StartStack`, also `docker compose up -d --build` |
| `-Smoke` | API smoke, AI eval, Mailpit email smoke, OpenAPI verify, k6, chaos, DR verify |
| `-Infra` | Terraform validate, Helm lint/template, Prometheus rules |
| `-Security` | actionlint and Gitleaks |
| `-Docs` | docs quality and `git diff --check` |
| `-All` | all scopes |

## Reports

Each run writes JSON and Markdown summaries under `reports/verification/`. The `reports/` directory is intentionally ignored by Git because it contains generated runtime evidence.

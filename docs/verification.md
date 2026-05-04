# Verification Runner

`scripts/verify.ps1` is the single entry point for portfolio-grade local verification. It keeps the quick developer path small while still supporting a full release-style gate.

`scripts/portfolio-verify.ps1` is the reviewer-friendly wrapper. It uses the same underlying checks and scripts, but exposes the simpler `-Backend`, `-Frontend`, `-Docker`, `-Runtime`, `-Security`, `-Docs`, and `-All` scopes and writes reports to `reports/portfolio-verify/`.

## Quick Checks

Run the default backend and docs gate:

```powershell
.\scripts\verify.ps1
```

Run docs and Docker syntax only:

```powershell
.\scripts\verify.ps1 -Docs -Docker
.\scripts\portfolio-verify.ps1 -Docs -Docker
```

Run runtime proof against an already running Docker stack:

```powershell
.\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl http://localhost:8080
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

## Portfolio Verifier Scopes

| Flag | Checks |
|---|---|
| `-Backend` | `mvn -T1 clean verify` and coverage gate |
| `-Frontend` | frontend typecheck and production build |
| `-Docker` | `docker compose config --quiet`; with `-StartStack`, also `docker compose up -d --build` |
| `-Runtime` | Gateway readiness, API smoke, AI eval, Mailpit email smoke, OpenAPI verify, role-based k6 smoke |
| `-Security` | actionlint and Gitleaks through Docker |
| `-Docs` | docs quality, version consistency, API compatibility manifest, and `git diff --check` |
| `-All` | all portfolio verifier scopes |

## Reports

`verify.ps1` writes JSON and Markdown summaries under `reports/verification/`.

`portfolio-verify.ps1` writes JSON and Markdown summaries under `reports/portfolio-verify/`.

The `reports/` directory is intentionally ignored by Git because it contains generated runtime evidence.

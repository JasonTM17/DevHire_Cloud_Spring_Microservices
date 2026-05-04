# Repository Structure

DevHire Cloud is intentionally a monorepo because the portfolio needs one-command verification across backend services, frontend, infrastructure, operations evidence, and release governance.

## Top-Level Layout

| Path | Purpose | Reviewer Signal |
|---|---|---|
| `api-gateway/` | Spring Cloud Gateway entrypoint, JWT validation, routing, CORS, rate limiting | External traffic boundary is explicit |
| `auth-service/` | Register/login/refresh/logout/me, BCrypt, JWT, refresh token rotation | Authentication is isolated |
| `user-service/` | Candidate and employer profile APIs | User data is service-owned |
| `company-service/` | Company onboarding and admin approval | Employer workflow boundary |
| `job-service/` | Job posting, review workflow, OpenSearch-backed search | Search and job lifecycle are isolated |
| `application-service/` | Candidate applications, duplicate prevention, status history | Transactional workflow evidence |
| `notification-service/` | Internal notifications, Mailpit/Gmail delivery, retry status | Delivery hardening evidence |
| `audit-service/` | Administrative audit log ingestion and filters | Governance and traceability |
| `ai-service/` | Claude Haiku assistant, RAG citations, fallback, safety evals | AI portfolio layer is isolated |
| `common-lib/` | Shared DTOs, errors, headers, events, security helpers | Shared contracts without shared JPA entities |
| `frontend/` | Next.js recruiter demo UI | Product-facing proof of the backend |
| `deploy/` | Kubernetes, Helm, GitOps, Terraform AWS blueprint | Cloud deployment evidence |
| `infra/` | Local observability, dashboards, Prometheus/Loki/Tempo/Grafana config | Operations evidence |
| `perf/` | k6 role-based smoke and load scripts | Performance proof |
| `scripts/` | Reviewer, runtime, cleanup, smoke, governance, and maintenance automation | One-command verification |
| `docs/` | Case study, runbooks, release evidence, ADRs, screenshots, governance docs | Recruiter and senior-engineer review path |
| `.github/` | CI/CD, security, Dependabot, issue/PR templates, CODEOWNERS | Supply-chain and release governance |

## What Is Intentionally Not Tracked

The repository should not track runtime or machine-local artifacts:

- `.env` and provider secrets,
- generated `reports/`,
- Maven `target/`,
- frontend `.next/`, `test-results/`, `playwright-report/`, `node_modules/`,
- JVM crash logs,
- Terraform state or plans,
- local backups.

Use:

```powershell
.\scripts\repo-hygiene.ps1
.\scripts\clean-local-artifacts.ps1 -DryRun
```

## GitHub Facade Ownership

Public About/Homepage/Topics and branch protection are not stored in Git. They are applied through:

- local `scripts/github-governance.ps1 -Apply` with a short-lived owner token, or
- the manual `Repository Governance` GitHub Actions workflow using `REPO_GOVERNANCE_TOKEN`.

## Why `.stitch/` Was Removed

The original UI design system lived under `.stitch/DESIGN.md`. For a public engineering portfolio, a root tool workspace folder reads as an implementation artifact. The content now lives in [design-system.md](design-system.md), where it is reviewable as product/design evidence.

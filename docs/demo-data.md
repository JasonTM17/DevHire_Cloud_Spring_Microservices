# Portfolio Demo Data

DevHire Cloud ships with two seed layers:

- Baseline seed data in each service `V2__seed_data.sql` migration. This keeps the original demo accounts and a compact happy-path dataset.
- Portfolio volume seed data in later migrations. This gives the reviewer enough records to exercise pagination, filtering, dashboards, email delivery states, audit filters, and AI conversation history without relying on generated runtime reports.

The dataset is synthetic. Company, candidate, and job names are fictional but realistic. No real candidate data, real employer data, API key, token, or credential is stored in these migrations.

## Volume Seed Summary

| Service | Migration | Added records | Review value |
|---|---|---:|---|
| auth-service | `V4__portfolio_volume_seed.sql` | 72 users | RBAC/login scale with employer and candidate accounts |
| user-service | `V3__portfolio_volume_seed.sql` | 72 profiles | Candidate/employer profile dashboards and search context |
| company-service | `V4__portfolio_volume_seed.sql` | 24 companies | Approved, pending, and rejected company states |
| job-service | `V4__portfolio_volume_seed.sql` | 180 jobs | Job search, filters, pagination, salary ranges, review states |
| application-service | `V4__portfolio_volume_seed.sql` | 240 applications plus history | Duplicate-prevention and pipeline status evidence |
| notification-service | `V7__portfolio_volume_seed.sql` | 220 notifications | Read/unread counts, SMTP delivery states, retry evidence |
| audit-service | `V4__portfolio_volume_seed.sql` | 280 audit logs | Admin filtering by actor, action, resource, metadata, date |
| ai-service | `V2__portfolio_volume_seed.sql` | 20 conversations, 40 messages, 20 usage events | AI assistant history, citations, fallback, and tool trace evidence |

Expected portfolio volume rows across primary tables: `1,108`.

## Inspect The Dataset

Static summary:

```powershell
.\scripts\demo-data-summary.ps1
```

Static distribution evidence without Docker:

```powershell
.\scripts\demo-data-summary.ps1 -Aggregates
```

Runtime count comparison after Docker is running:

```powershell
docker compose up -d --build
.\scripts\demo-data-summary.ps1 -FromDocker
```

The runtime command queries each service-owned PostgreSQL database independently. It does not call another service's database and does not mutate data.

## Data Design Rules

- IDs use deterministic UUID ranges so screenshots, audit logs, and dashboard data remain stable between runs.
- Every service owns its own schema and seed migration; no service shares JPA entities or cross-reads another database.
- Flyway migrations use `ON CONFLICT` where the table has a natural unique key or deterministic primary key.
- Large tables are generated with PostgreSQL `generate_series` so the repository stays readable.
- Application rows are generated with unique `(candidate_id, job_id)` pairs to preserve the production duplicate-prevention constraint.
- Job statuses intentionally include `PUBLISHED`, `PENDING_REVIEW`, `CLOSED`, `DRAFT`, and `REJECTED`.
- Notification rows intentionally include `PENDING`, `SENT`, `FAILED_RETRYABLE`, `FAILED_PERMANENT`, and `SKIPPED_NO_EMAIL`.

## Distribution Evidence

The static aggregate mode is intentionally deterministic, so reviewers can confirm the portfolio dataset supports dashboards even before starting Docker:

| Signal | Distribution |
|---|---|
| Companies | 21 approved, 2 pending, 1 rejected |
| Jobs | 150 published, 15 pending review, 10 closed, 3 draft, 2 rejected |
| Applications | 130 submitted, 33 reviewing, 27 interview, 19 rejected, 17 offer, 14 withdrawn |
| Notifications | 151 pending, 36 sent, 15 retryable failures, 9 permanent failures, 9 skipped because no email |
| Audit logs | 151 job searches, 35 logins, 28 company creates, 18 job creates, 18 company approvals, 13 application submissions, 7 application transitions, 6 job approvals, 4 AI tool executions |
| AI usage | 20 fallback-backed Claude Haiku conversations for CI-safe review |

## Demo Accounts

The original login accounts remain unchanged:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@devhire.local` | `Admin@123456` |
| Employer | `employer@devhire.local` | `Employer@123456` |
| Candidate | `candidate@devhire.local` | `Candidate@123456` |

Additional generated users share portfolio-only local password hashes for demo realism, but the recommended reviewer path still uses the three stable accounts above.

# Data Model And Seed Strategy

DevHire Cloud uses service-owned PostgreSQL databases. Seed data is intentionally distributed across each service migration instead of loaded by one shared script, because that mirrors the real production boundary: services may exchange IDs and events, but they do not read each other's tables.

## Why The Dataset Is Large

The portfolio dataset is designed to prove more than CRUD:

- pagination and sorting on job search;
- candidate application timelines and duplicate prevention;
- employer applicant queues;
- admin audit filtering;
- notification unread counts and email retry states;
- AI assistant conversation history and usage evidence;
- Grafana dashboards with non-empty runtime metrics.

Primary portfolio seed volume:

| Service | Database | Main table | Portfolio rows | Purpose |
|---|---|---|---:|---|
| auth-service | `devhire_auth` | `user_accounts` | 72 | 12 employers and 60 candidates for RBAC/login scale |
| user-service | `devhire_user` | `user_profiles` | 72 | candidate/employer profiles for reviewer dashboards |
| company-service | `devhire_company` | `companies` | 24 | approved, pending, rejected review states |
| job-service | `devhire_job` | `jobs` | 180 | published/searchable jobs plus review/draft/closed/rejected |
| application-service | `devhire_application` | `job_applications` | 240 | status pipeline, duplicate prevention, history volume |
| notification-service | `devhire_notification` | `notifications` | 220 | unread counts, email delivery states, retry backlog |
| audit-service | `devhire_audit` | `audit_logs` | 280 | actor/action/resource/date filtering |
| ai-service | `devhire_ai` | `ai_conversations` | 20 | Claude assistant history, citations, usage events |

Total primary portfolio rows: **1,108**.

## Deterministic IDs

Seed IDs are deterministic so cross-service demo flows stay stable without cross-reading databases:

- candidates use `10000000-0000-0000-0001-*`;
- employers use `10000000-0000-0000-0002-*`;
- companies use `20000000-0000-0000-0001-*`;
- jobs use `30000000-0000-0000-0001-*`;
- applications use `40000000-0000-0000-0001-*`;
- notifications use `50000000-0000-0000-0001-*`;
- audit logs use `60000000-0000-0000-0001-*`;
- AI conversations use `70000000-0000-0000-0001-*`.

This makes runtime dashboards and E2E flows reproducible while preserving service ownership.

## Verification

Static expected counts:

```powershell
.\scripts\demo-data-summary.ps1
```

Runtime table counts and domain aggregates after Docker is running:

```powershell
.\scripts\demo-data-summary.ps1 -FromDocker -Aggregates
```

Migration-only smoke across isolated temporary databases:

```powershell
.\scripts\migration-smoke.ps1
```

Runtime observability smoke:

```powershell
.\scripts\runtime-observability-smoke.ps1 -GatewayUrl http://localhost:8080
```

Generated reports are written under `reports/` and stay ignored.

## Dashboard Mapping

| Dashboard signal | Source |
|---|---|
| Recruitment funnel | `job_applications`, `application_status_history` |
| Event reliability | `outbox_events`, notification email state |
| Search and AI | job search counters/timers, `ai_conversations`, `ai_usage_events` |
| Audit distribution | `audit_logs.action` |
| Runtime service health | actuator, JVM, Hikari, Prometheus scrape status |

The dataset is synthetic and safe to commit. It contains no real candidate resumes, credentials, provider keys, or production emails.

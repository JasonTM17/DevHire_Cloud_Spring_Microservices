# DevHire Cloud v0.6 UI Redesign

This document is the implementation bridge from the Stitch project to the production frontend and backend read models.

## Stitch Source

- Stitch project: `projects/5421325194779586117`
- Product split: Admin/Ops, Employer/Company, Client/Candidate
- Frontend branch: `v0.6-stitch-client-admin-redesign`
- Goal: make the product feel like a recruitment operations platform instead of a static portfolio demo.

## Route Mapping

| Product area | Stitch screen | Route |
|---|---|---|
| Admin/Ops | Operations Dashboard | `/admin` |
| Admin/Ops | Recruitment Pipelines | `/employer` |
| Admin/Ops | Observability & Event Streaming | `/platform/observability` |
| Admin/Ops | Infrastructure & K8s Control Plane | `/platform/cloud` |
| Admin/Ops | CI/CD & Deployment Registry | `/platform/releases` |
| Admin/Ops | AI RAG Talent Intelligence | `/assistant`, `/admin/ai` |
| Employer/Company | Company Profile & Jobs | `/companies/[slug]` |
| Client | Job Discovery Mobile | `/jobs` |
| Client | Job Detail | `/jobs/[id]` |
| Client | Candidate Dashboard | `/candidate` |
| Client | My Applications | `/candidate/applications` |
| Client | Candidate Profile | `/candidate/profile` |
| Client | Skill Assessment | `/candidate/assessments` |
| Client | Offer Letter | `/candidate/offers` |
| Client | AI Interview Prep Hub | `/candidate/interview-prep` |
| Client | Cloud Career Roadmap | `/candidate/roadmap` |
| Client | Cloud Skill Analytics | `/candidate/skill-analytics` |
| Client | Engineering Community Hub | `/community` |

## Backend Read Models

v0.6 keeps the existing public APIs backward compatible and adds read-model endpoints for the new product surfaces:

| Service | Endpoint | Purpose |
|---|---|---|
| application-service | `GET /candidate/dashboard/summary` | Candidate application KPIs and timeline |
| application-service | `GET /candidate/applications/summary` | Candidate application status distribution |
| application-service | `GET /candidate/offers` | Candidate offer review experience |
| application-service | `GET /candidate/assessments` | Candidate assessment progress |
| application-service | `GET /employer/pipeline/summary` | Employer pipeline counters and recent activity |
| job-service | `GET /candidate/skill-analytics` | Skill, location, level, and salary demand signals |
| ai-service | `GET /candidate/roadmap` | Candidate career roadmap recommendations |
| ai-service | `GET /candidate/interview-prep` | Recent AI interview prep sessions |
| audit-service | `GET /admin/operations/summary` | Admin control-plane audit aggregates |

All read models are routed through the API Gateway under `/api/...` and still rely on gateway identity headers plus service-level role checks.

## Data Additions

The application service owns persisted candidate experience data:

- `candidate_offers`
- `candidate_assessments`

These are seeded deterministically by Flyway so portfolio pages can render rich state without cross-reading another service database.

## UX Acceptance Rules

- Candidate pages are mobile-friendly and guided.
- Admin/platform pages are compact and operational.
- Primary screenshots avoid raw IDs, `UNKNOWN`, loading-only states, fallback/offline warnings, and smoke/test labels.
- Controls that look interactive either call a read model or present a clear preview state.
- The role-aware navigation groups Candidate, Employer, Admin/Ops, and Platform workspaces.

## Verification

Current v0.6 implementation checks:

```powershell
mvn -T1 -pl application-service,job-service,ai-service,audit-service,api-gateway -am test
cd frontend
npm run typecheck
npm run build
```

Full release verification still uses the repository gates:

```powershell
mvn -T1 clean verify
cd frontend
npm run e2e:all
.\scripts\portfolio-verify.ps1 -Docs -Docker -Cloud
```

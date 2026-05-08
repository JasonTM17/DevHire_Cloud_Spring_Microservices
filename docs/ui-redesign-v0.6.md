# DevHire Cloud v0.6 UI Redesign

This document is the implementation bridge from the Stitch project to the production frontend and backend read models.

## Stitch Source

- Stitch project: `projects/5421325194779586117`
- Product split: Admin/Ops, Employer/Company, Client/Candidate
- Frontend branches: `v0.6-stitch-client-admin-redesign`, `v0.6.1-stitch-fidelity-polish`, `v0.6.2-stitch-completion-polish`, `v0.6.3-stitch-full-app-completion`, stacked `v0.6.4-code-assessment-grading`, stacked `v0.6.5-code-assessment-review-polish`, stacked `v0.6.6-stitch-code-assessment-completion`, and stacked `v0.6.7-code-assessment-flagship`
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
| Client | Code Assessment Studio | `/candidate/assessments` |
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
| application-service | `GET /candidate/code-assessments` | Candidate code challenge queue, redacted list metadata, and rubric evidence |
| application-service | `GET /candidate/code-assessments/{id}` | Owner-only candidate code assessment detail with submitted code |
| application-service | `POST /candidate/code-assessments/{id}/runs` | Visible code test run through the internal assessment runner with integrity events |
| application-service | `GET /candidate/code-assessments/{id}/runs/{runId}` | Candidate-owned run status with visible result evidence only |
| application-service | `POST /candidate/code-assessments/{id}/submissions` | Server-side rubric, hidden tests, integrity, similarity, and final score |
| application-service | `GET /employer/pipeline/summary` | Employer pipeline counters and recent activity |
| application-service | `GET /employer/code-assessments` | Employer-owned code review queue with redacted submitted code preview |
| application-service | `GET /employer/code-assessments/{id}` | Employer-owned review dossier with submitted code detail |
| application-service | `PATCH /employer/code-assessments/{id}/review` | Employer review decision and final score |
| application-service | `GET /admin/code-assessments/summary` | Admin code assessment health, risk flags, runner queue, sandbox failure rate, integrity, and similarity posture |
| assessment-runner-service | `POST /internal/assessment-runs` | Judge0-compatible internal runner adapter for isolated visible/hidden test execution |
| job-service | `GET /candidate/skill-analytics` | Skill, location, level, and salary demand signals |
| ai-service | `GET /candidate/roadmap` | Candidate career roadmap recommendations |
| ai-service | `GET /candidate/interview-prep` | Recent AI interview prep sessions |
| audit-service | `GET /admin/operations/summary` | Admin control-plane audit aggregates |

All read models are routed through the API Gateway under `/api/...` and still rely on gateway identity headers plus service-level role checks.

The Stitch fidelity polish adds two production-facing refinements:

- `GET /api/companies/slug/{slug}` resolves the company profile route by public slug instead of rendering the first company in the list.
- `GET /api/jobs` now accepts optional `type` and `companyId` filters in addition to keyword, skill, location, salary, and level. PostgreSQL and OpenSearch adapters both honor the new filters.
- Public `GET /api/companies`, `GET /api/companies/{id}`, and `GET /api/jobs/{id}` are constrained to approved/published records; admin and employer workspaces use scoped read-model endpoints.

## Data Additions

The application service owns persisted candidate experience data:

- `candidate_offers`
- `candidate_assessments`
- `code_challenges`
- `code_challenge_test_cases`
- `code_assessment_assignments`
- `code_assessment_runs`
- `code_assessment_run_results`
- `code_session_integrity_events`
- `code_similarity_reports`
- `code_submissions`
- `code_review_events`

These are seeded deterministically by Flyway so portfolio pages can render rich state without cross-reading another service database.

v0.6.7 keeps code grading reviewer-safe and v0.7 introduces the internal runner boundary: candidate code is stored by `application-service`, visible cases can be run through `assessment-runner-service`, hidden cases are executed only during final submission, and final score remains server-owned. The application service adds attempt number, code hash, grader version, rubric version, submitted-code preview, list/detail redaction, run metadata, integrity signals, similarity reports, and sandbox status so the feature can be reviewed like a production workflow.

## UX Acceptance Rules

- Candidate pages are mobile-friendly and guided.
- Admin/platform pages are compact and operational.
- Primary screenshots avoid raw IDs, `UNKNOWN`, loading-only states, fallback/offline warnings, and smoke/test labels.
- Controls that look interactive either call a read model or present a clear preview state.
- The role-aware navigation groups Candidate, Employer, Admin/Ops, and Platform workspaces.
- Company profile pages use the actual route slug and scope jobs to the resolved company.
- Candidate profile pages use `GET /api/users/me` when signed in and a polished read-only sample when unauthenticated.
- Repeated status distributions, timelines, offers, and pipeline rows use shared Stitch-aligned components so the UI reads as one product.

## Implementation Status

| Stitch screen | Route | Data backing | Evidence |
|---|---|---|---|
| Job Discovery | `/jobs` | Job service public search with keyword, skill, location, salary, level, type, company, sorting, and pagination | `stitch/client-jobs.png`, Playwright route matrix |
| Job Detail | `/jobs/[id]` | Published-only job detail plus application submit state | `stitch/client-job-detail.png`, dynamic published-job E2E |
| Candidate Dashboard | `/candidate` | Application service dashboard read model and notification read model | `stitch/candidate-dashboard.png`, candidate login E2E |
| My Applications | `/candidate/applications` | Application summary read model with status distribution and timeline | `stitch/candidate-applications.png` |
| Candidate Profile | `/candidate/profile` | `GET /api/users/me` when signed in, polished read-only sample when unauthenticated | `stitch/candidate-profile.png` |
| Code Assessment Studio | `/candidate/assessments` | Application service code assessment assignments, owner detail fetch, visible runner cases, hidden server-side tests, deterministic rubric scoring, redacted previews, challenge-language guard, code hash metadata, integrity/similarity risk flags, sandbox status, and submission history | `stitch/candidate-assessments.png`, candidate code-submit E2E |
| Offer Letter | `/candidate/offers` | Application service offer read model | `stitch/candidate-offers.png` |
| AI Interview Prep | `/candidate/interview-prep` | AI service interview-prep read model | `stitch/candidate-interview-prep.png` |
| Cloud Career Roadmap | `/candidate/roadmap` | AI service roadmap read model | `stitch/candidate-roadmap.png` |
| Cloud Skill Analytics | `/candidate/skill-analytics` | Job service skill analytics read model | `stitch/candidate-skill-analytics.png` |
| Engineering Community Hub | `/community` | Curated frontend content for v0.6 | `stitch/client-community.png` |
| Company Profile & Jobs | `/companies/[slug]` | Approved company slug lookup and company-scoped public jobs | `stitch/company-profile.png` |
| Recruitment Pipelines | `/employer` | Employer company list, employer pipeline summary, applicant queue, filterable code review queue, selected candidate review dossier, hidden/visible run summary, integrity risk, and similarity posture | `stitch/employer-pipeline.png`, employer login E2E |
| Operations Dashboard | `/admin` | Company/job review queues, operations summary, audit logs, AI provider status, code assessment health, runner queue, sandbox failure rate, and risk posture | `stitch/admin-control-plane.png`, admin login E2E |
| AI RAG Talent Intelligence | `/assistant`, `/admin/ai` | AI chat, citations, provider status, and knowledge reindex controls | `stitch/assistant.png`, `stitch/admin-ai-ops.png` |
| Observability & Event Streaming | `/platform/observability` | Static operations evidence panels linked to Prometheus/Grafana/runbooks | `stitch/platform-observability.png` |
| Infrastructure & K8s Control Plane | `/platform/cloud` | Static cloud evidence panels linked to Terraform/Helm/GitOps scripts | `stitch/platform-cloud.png` |
| CI/CD & Deployment Registry | `/platform/releases` | Static release evidence panels linked to workflows, image metadata, and verification scripts | `stitch/platform-releases.png` |

The v0.6.3 completion pass promotes these route-matrix screenshots into `docs/screenshots/stitch/`. v0.6.4 refreshes the candidate assessment, employer pipeline, and admin control-plane screenshots so code grading evidence appears in the primary Stitch surfaces. v0.6.5 tightens the employer review card state and E2E coverage so the staged flow proves candidate submission plus employer decision, not just a static rubric panel. v0.6.6 adds candidate submission history and employer-side status/job filters so the code assessment workflow reads like an operational review queue. v0.6.7 makes code assessment the flagship workflow with Assessment Studio, safe list/detail raw-code boundaries, attempt/hash/rubric metadata, employer review dossier, and admin health posture; the v0.7 runner boundary adds visible/hidden test execution, integrity signals, and similarity posture without moving domain ownership out of application-service.

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

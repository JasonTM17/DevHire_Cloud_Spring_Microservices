# UI/UX Audit - Client Marketplace And Code Assessment

This audit records the professional UI contract for the current DevHire Cloud frontend. It is intentionally short and executable: reviewers should be able to compare the screenshots, browser routes, and smoke scripts against the claims below.

## Design Direction

DevHire uses a hybrid design system:

| Area | Direction | Must show |
|---|---|---|
| Client/job marketplace | ITViec-inspired search-first marketplace, without copying ITViec branding or assets | Red/white search surfaces, salary and location clarity, company credibility, compact filters, mobile-safe job cards |
| Candidate LeetCode Studio | Focused coding workspace | `Cloud Architecture Challenge`, `CandidateSolution.java`, visible/custom runs, stdout/stderr/compile output, attempt history, submitted/locked states |
| Employer review | Evidence dossier | Submitted code, score, verdict, runtime/static score, risk flags, visible aggregate, hidden aggregate, sanitized output, immutable raw score |
| Admin/Ops | Stitch control plane | Runner health, fail-closed reason, queue depth, verdict rates, risky backlog, operational empty/auth states |

## Browser Routes

Run the local frontend through Docker or `npm run dev`, then inspect:

```powershell
# Docker high-port convention used by local smoke
$env:FRONTEND_HOST_PORT="13001"
docker compose up -d --build frontend api-gateway application-service assessment-runner-service
```

Primary routes:

| Route | Acceptance |
|---|---|
| `/` | Search-first IT jobs hero, no mojibake, visible skills, top employers, featured jobs |
| `/jobs` | Keyword from `?search=` is honored, filters are readable, empty/error states are friendly |
| `/jobs/[id]` | Salary, skills, company card, login-safe apply modal, no broken Vietnamese copy |
| `/candidate/assessments` | Java-only production challenge, visible cases, no hidden payload leakage |
| `/employer/applications` | Employer workspace renders, assessment dossier is available after assignment |
| `/admin` and `/admin/monitoring` | Unauthenticated state is polished; authenticated state shows runner/admin metrics |

Forbidden visible copy in primary screenshots:

- `CloudServiceApplication`
- `Java production validation challenge`
- `@Test`
- raw `UNKNOWN`, `AUTO_REVIEWED`, `EMPLOYER_REVIEWED`
- `Missing bearer token`
- mojibake markers caught by `scripts/docs-quality.ps1`
- hidden stdin, hidden expected output, hidden stdout/stderr

## Verification

```powershell
npm --prefix frontend run typecheck
npm --prefix frontend run e2e:preview
npm --prefix frontend run e2e:preview:mobile
.\scripts\code-assessment-smoke.ps1 -GatewayUrl http://localhost:18080
.\scripts\runtime-observability-smoke.ps1 -GatewayUrl http://localhost:18080
.\scripts\docs-quality.ps1
.\scripts\evidence-audit.ps1
```

Use Browser visual inspection after significant frontend changes. Capture screenshots only after the route has settled and the page contains real data or a deliberate empty/auth state.

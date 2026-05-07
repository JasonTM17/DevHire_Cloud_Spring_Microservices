# Code Assessment Reviewer Proof

This page is the 5-minute reviewer path for the flagship DevHire Cloud code assessment workflow. The feature is intentionally safe in v0.6.7: it grades submitted code with a deterministic static rubric and does not execute untrusted candidate code.

## What It Proves

| Claim | Evidence |
|---|---|
| Candidate workflow is product-grade | `/candidate/assessments` shows a challenge queue, problem statement, static cases, code editor panel, notes, rubric, risk flags, metadata, and submission history |
| Backend owns the domain | `application-service` persists challenges, assignments, submissions, and review events with Flyway migrations |
| List/detail boundaries are safe | list endpoints redact raw code; detail endpoints expose code only to the owning candidate or employer |
| Scoring is deterministic | final score comes from `static-rubric-v1`; optional AI feedback is advisory and cannot overwrite the score |
| Review is auditable | submissions and employer decisions publish audit metadata including attempt number, code hash, grader version, rubric version, score, risk flags, and decision |
| Operations can see health | `/admin` and `/admin/ai` surface submitted, reviewed, passed, failed, average score, and risk flag posture |

## 5-Minute Demo Path

1. Sign in as `candidate@devhire.local` and open `/candidate/assessments`.
2. Select `Java outbox retry reviewer`.
3. Review the visible static cases and required signals.
4. Edit the code and run static analysis.
5. Submit for rubric score and confirm rubric rows, risk flags, attempt metadata, and submission history.
6. Sign in as `employer@devhire.local` and open `/employer`.
7. Open the code assessment review dossier, inspect the redacted list preview plus owner detail code, add reviewer notes, and advance or hold the candidate.
8. Sign in as `admin@devhire.local` and open `/admin` or `/admin/ai` to verify assessment health and audit posture.

## API Contract

| Role | Endpoint | Behavior |
|---|---|---|
| Candidate | `GET /api/candidate/code-assessments` | Lists own assignments with code preview metadata, no full raw code |
| Candidate | `GET /api/candidate/code-assessments/{id}` | Reads own assignment detail with submitted code |
| Candidate | `POST /api/candidate/code-assessments/{id}/submissions` | Normalizes language, enforces deadline/final-status rules, scores code, stores attempt metadata |
| Employer | `GET /api/employer/code-assessments` | Lists employer-owned review queue with filters and redacted code preview |
| Employer | `GET /api/employer/code-assessments/{id}` | Reads employer-owned detail with submitted code |
| Employer | `PATCH /api/employer/code-assessments/{id}/review` | Records advance, hold, or reject with reviewer notes and final score |
| Admin | `GET /api/admin/code-assessments/summary` | Aggregates assessment health for operations dashboard |

## Scoring Rubric

| Category | Points |
|---|---:|
| Correctness and completeness | 40 |
| Maintainability and readability | 20 |
| Complexity and performance awareness | 15 |
| Security posture | 15 |
| Test and evidence quality | 10 |

The static grader flags starter-code-only submissions, hardcoded secrets, unsafe process execution, I/O boundary risks, and missing test evidence. Signals found only in comments are treated as weaker evidence than implementation signals.

## Verification

```powershell
mvn -pl application-service -am "-Dtest=CodeAssessmentServiceTest,CodeAssessmentControllerTest,CodeAssessmentGraderTest" "-Dsurefire.failIfNoSpecifiedTests=false" test
cd frontend
npm run typecheck
npm run e2e:all
```

Runtime evidence after Docker is up:

```powershell
.\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl http://localhost:8080
.\scripts\runtime-observability-smoke.ps1 -GatewayUrl http://localhost:8080
```

## v0.7 Boundary

Sandbox execution is deliberately out of scope for v0.6.7. The future v0.7 worker must run untrusted code in an isolated runtime with CPU, memory, filesystem, network, and timeout controls before execution can become production-safe.

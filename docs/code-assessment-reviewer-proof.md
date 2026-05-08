# Code Assessment Reviewer Proof

This page is the 5-minute reviewer path for the flagship DevHire Cloud code assessment workflow. v0.6.7 keeps the Stitch product surface focused on Code Interview Studio, and the v0.7 boundary adds an internal `assessment-runner-service` so visible runs, hidden final tests, integrity signals, similarity posture, and audit metadata are owned server-side.

## What It Proves

| Claim | Evidence |
|---|---|
| Candidate workflow is product-grade | `/candidate/assessments` behaves like an interview coding studio: challenge queue, problem statement, examples, visible judge cases, complexity targets, code editor panel, notes, rubric, risk flags, metadata, and submission history |
| Backend owns the domain | `application-service` persists challenges, assignments, test cases, runs, submissions, integrity events, similarity reports, and review events with Flyway migrations |
| List/detail boundaries are safe | list endpoints redact raw code; detail endpoints expose code only to the owning candidate or employer |
| Scoring is server-owned | final score blends deterministic rubric evidence with server-side visible/hidden test execution; candidates cannot set score from the client |
| Hidden tests stay hidden | visible runs return visible cases only; submissions execute hidden cases server-side; candidate-facing payloads redact hidden results and counts while employer/admin evidence keeps aggregate review posture |
| Review is auditable | submissions and employer decisions publish audit metadata including attempt number, code hash, grader version, rubric version, score, risk flags, run id, hidden counts, integrity risk, similarity score, and decision |
| Operations can see health | `/admin` and `/admin/ai` surface submitted, reviewed, passed, failed, average score, risk flags, runner queue, sandbox failures, integrity risk, and similarity posture |
| Attempts are production-guarded | assignment rows are locked before attempt allocation, `(assignment_id, attempt_number)` is unique, language/code length/review timestamp and score/hash/version constraints are enforced in the database |
| SLOs include the flagship feature | Prometheus alerts cover grading failures, runner requests, review backlog, risky-submission backlog, and grading latency |

## 5-Minute Demo Path

1. Sign in as `candidate@devhire.local` and open `/candidate/assessments`.
2. Select `Cloud Architecture Challenge`.
3. Review the problem statement, examples, visible judge cases, complexity target, and scoring signals.
4. Edit the code and run visible judge analysis.
5. Submit for rubric score and confirm rubric rows, risk flags, attempt metadata, hash, and submission history without exposing hidden-test payloads to the candidate.
6. Sign in as `employer@devhire.local` and open `/employer`.
7. Open the code assessment review dossier, inspect the redacted list preview plus owner detail code, add reviewer notes, and advance or hold the candidate.
8. Sign in as `admin@devhire.local` and open `/admin` or `/admin/ai` to verify assessment health and audit posture.

## API Contract

| Role | Endpoint | Behavior |
|---|---|---|
| Candidate | `GET /api/candidate/code-assessments` | Lists own assignments with code preview metadata, no full raw code |
| Candidate | `GET /api/candidate/code-assessments/{id}` | Reads own assignment detail with submitted code |
| Candidate | `POST /api/candidate/code-assessments/{id}/runs` | Runs visible test cases through the internal runner, records integrity events, and returns visible results only |
| Candidate | `GET /api/candidate/code-assessments/{id}/runs/{runId}` | Reads own run status and visible result evidence |
| Candidate | `POST /api/candidate/code-assessments/{id}/submissions` | Normalizes language, enforces challenge-language/deadline/final-status rules, runs hidden tests server-side, scores code, stores attempt metadata |
| Employer | `GET /api/employer/code-assessments` | Lists employer-owned review queue with filters and redacted code preview |
| Employer | `GET /api/employer/code-assessments/{id}` | Reads employer-owned detail with submitted code |
| Employer | `PATCH /api/employer/code-assessments/{id}/review` | Records advance, hold, or reject with reviewer notes and final score |
| Admin | `GET /api/admin/code-assessments/summary` | Aggregates assessment health, runner queue, sandbox failure rate, integrity risk, and similarity posture for operations dashboard |

List endpoints intentionally return a secret-redacted `submittedCodePreview` and `hasSubmittedCode`, not the full raw submission. Full code is limited to owner detail endpoints for the candidate and employer review flow.

## Scoring Rubric

| Category | Points |
|---|---:|
| Correctness and completeness | 40 |
| Maintainability and readability | 20 |
| Complexity and performance awareness | 15 |
| Security posture | 15 |
| Test and evidence quality | 10 |

The candidate UI mirrors a safe LeetCode-style interview loop: read the prompt, inspect examples, run visible judge analysis, submit, then review deterministic rubric evidence without receiving hidden-test payloads or hidden pass counts. The runner adapter blocks process, filesystem, and network boundary smells before scoring; if the configured runner is unavailable, scoring fails closed instead of trusting a local pass. The static grader flags starter-code-only submissions, hardcoded secrets, unsafe process execution, I/O boundary risks, and missing test evidence. Signals found only in comments are treated as weaker evidence than implementation signals.

The server-side score remains the source of truth. AI feedback can be layered in later as an advisory explanation path, but it does not override rubric, runner, integrity, or similarity decisions.

## Operations Signals

| Signal | Purpose |
|---|---|
| `devhire_code_assessments_total{status}` | Current assessment queue by status |
| `devhire_code_submissions_total{language,status}` | Submitted code volume by grading status; current portfolio gauges use `language=ALL` while request counters track the submitted language |
| `devhire_code_grading_requests_total{language,status}` | Deterministic grading success/failure count |
| `devhire_code_grading_latency_seconds` | Grading latency histogram |
| `devhire_code_grading_score` | Average deterministic rubric score |
| `devhire_code_review_risk_flags_total{type}` | Submissions with static risk flags; current portfolio gauge uses `type=any` for backlog posture |
| `devhire_code_review_decisions_total{decision,status}` | Employer review decisions |
| `devhire_assessment_runner_requests_total{language,status}` | Internal runner request count by language and status |
| `devhire_assessment_runner_latency_seconds` | Internal runner latency histogram |

## Verification

```powershell
mvn -pl application-service,assessment-runner-service -am "-Dtest=CodeAssessmentServiceTest,CodeAssessmentControllerTest,CodeAssessmentGraderTest,AssessmentRunnerServiceTest" "-Dsurefire.failIfNoSpecifiedTests=false" test
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

The first v0.7 boundary is now explicit: `assessment-runner-service` owns Judge0-compatible execution adapter behavior, while `application-service` remains the domain owner for assignments, hidden tests, scoring, audit, and review. The current adapter is intentionally conservative and blocks dangerous boundaries; a production deployment can swap the adapter behind the same internal API for a full isolated runtime with CPU, memory, filesystem, network, and timeout controls.

# Code Assessment Reviewer Proof

This is the reviewer path for DevHire Cloud's flagship code-assessment workflow. It proves a production-shaped, Java-first LeetCode experience without moving trust to the browser: candidates run visible cases, final submissions execute visible and hidden cases server-side, employers review evidence, and admins monitor runner health.

## Production Contract

| Area | Contract |
|---|---|
| Candidate submission | `class CandidateSolution { String solve(String input) { ... } }` |
| Java source rules | No `package`, no `public class CandidateSolution`, no JUnit or `@Test` requirement |
| Active challenge | `Cloud Architecture Challenge`, internal slug `java-cloud-architecture` |
| Test fixtures | Versioned visible/hidden cases with `stdin`, `expected_output`, `weight`, time limit, and memory limit |
| Output comparison | Runner normalizes line endings, trims trailing whitespace per line, then trims final output |
| Final score | 75% weighted runtime cases plus 25% static quality/security rubric |
| Trust boundary | `application-service` owns assignment, hidden cases, score, submission history, audit, and review; `assessment-runner-service` only executes code |

## What It Proves

| Claim | Evidence |
|---|---|
| Candidate workflow is product-grade | `/candidate/assessments` includes challenge queue, problem statement, examples, visible cases, Monaco Java editor with textarea fallback, custom input, run output, rubric, risk signals, and history |
| Hidden fixtures do not leak | Candidate APIs and UI expose visible runs only; final submission hides hidden stdin, expected output, hidden stdout/stderr, and hidden compile output |
| Employer review is evidence-based | Employer dossier shows submitted code, score, verdict, risk flags, visible aggregate, hidden aggregate, time/memory, sanitized output, and attempt timeline |
| Admin/Ops can operate it | `/admin` surfaces accepted/wrong/compile/timeout/policy/unavailable rates, queue depth, fail-closed state, sandbox failures, risk backlog, and challenge authoring |
| Production fails closed | Production compose/Kubernetes use `DEVHIRE_RUNNER_MODE=judge0` and require `JUDGE0_BASE_URL`; local deterministic mode is preview-only |
| Scoring stays server-owned | Browser requests cannot set score, hidden pass counts, runner verdict, code hash, or review decision |
| Audit trail is reviewable | Attempts store code hash, runner version, rubric version, risk flags, integrity risk, similarity score, run id, and employer decision |

## Demo Path

1. Sign in as `candidate@devhire.local` and open `/candidate/assessments`.
2. Select `Cloud Architecture Challenge`.
3. Review the statement, examples, visible cases, time/memory limits, and `CandidateSolution.java`.
4. Run visible tests or custom stdin and inspect verdict, stdout, stderr, compile output, time, and memory.
5. Submit and confirm the locked state, score, rubric, attempt metadata, and hidden redaction message.
6. Sign in as `employer@devhire.local`, open `/employer`, assign or open a code assessment, and inspect the review dossier.
7. Record `PASS`, `HOLD`, or `REJECT`; the raw server score remains immutable.
8. Sign in as `admin@devhire.local` and inspect assessment health, runner status, challenge authoring, and publish validation.

## API Contract

| Role | Endpoint | Behavior |
|---|---|---|
| Candidate | `GET /api/candidate/code-assessments` | Lists own assignments with redacted code preview metadata |
| Candidate | `GET /api/candidate/code-assessments/{id}` | Reads own assignment detail |
| Candidate | `POST /api/candidate/code-assessments/{id}/run` and `/runs` | Runs visible cases only |
| Candidate | `POST /api/candidate/code-assessments/{id}/submit` and `/submissions` | Executes final server-side grading and locks the assignment |
| Candidate | `GET /api/candidate/code-assessments/{id}/submissions` | Lists own attempts with hidden evidence redacted |
| Employer | `POST /api/employer/applications/{applicationId}/code-assessments` | Assigns the active Java challenge to an owned open application; duplicate assignment returns the existing row |
| Employer | `GET /api/employer/code-assessments/{id}` | Reads employer-owned dossier detail |
| Employer | `GET /api/employer/code-assessments/{id}/submissions` | Reads attempts with hidden aggregate metadata |
| Employer | `PATCH /api/employer/code-assessments/{id}/review` | Records pass, hold, or reject without changing raw score |
| Admin | `GET /api/admin/code-assessments/summary` | Reads grading rates, queue depth, risk backlog, and runner health |
| Admin | `GET/POST/PATCH /api/admin/code-challenges` | Lists, drafts, versions, validates, publishes, or deactivates challenges |
| Internal | `POST /internal/assessment-runs` | Executes Judge0-compatible runs behind the internal token boundary |
| Internal | `GET /internal/assessment-runs/health` | Reports runner mode, Judge0 configuration, fail-closed reason, queue depth, and version |

## Verdict And Score Policy

| Verdict | Trusted final score? | Evidence persisted? | Candidate visibility |
|---|---:|---:|---|
| `ACCEPTED` | Yes | Yes | Visible aggregate and final score |
| `WRONG_ANSWER` | Yes, partial runtime score | Yes | Visible aggregate and final score |
| `RUNTIME_ERROR` | Yes, partial runtime score | Yes | Sanitized visible evidence |
| `TIME_LIMIT_EXCEEDED` | Yes, partial runtime score | Yes | Sanitized visible evidence |
| `COMPILE_ERROR` | No trusted final score | Yes | Compile output for visible run/final message |
| `POLICY_BLOCKED` | No trusted final score | Yes | Policy-blocked message |
| `RUNNER_UNAVAILABLE` | No trusted final score | Yes | Runner unavailable/fail-closed message |

The static rubric rewards readable Java structure, parsing robustness, simplicity, and security cleanliness. It flags starter-code-only submissions, hardcoded secrets, unsafe process/file/network boundaries, low-signal code, and non-executable signal stuffing. AI feedback is advisory only and never overrides runner verdict, risk flags, score, or employer decision.

## Operations Signals

| Signal | Purpose |
|---|---|
| `devhire_code_assessments{status}` | Assignment lifecycle by status, including `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `REVIEWED`, and `EXPIRED` |
| `devhire_code_submissions{language,status}` | Submission volume by grading status |
| `devhire_code_grading_requests_total{language,status}` | Server-side grading request outcome |
| `devhire_code_grading_latency_seconds` | Application grading latency histogram |
| `devhire_code_grading_score` | Average runtime-plus-static rubric score |
| `devhire_code_review_risk_flags{type}` | Static risk backlog |
| `devhire_code_review_decisions_total{decision,status}` | Employer review decisions |
| `devhire_code_runner_client_failures_total{language}` | Application-service runner client failures |
| `devhire_assessment_runner_requests_total{language,status,verdict}` | Runner request count by terminal verdict |
| `devhire_assessment_runner_latency_seconds` | Runner execution latency histogram |
| `devhire_assessment_runner_queue_depth` | In-process runner queue depth |
| `devhire_assessment_runner_sandbox_failures_total{reason}` | Policy and unavailable sandbox failures |
| `devhire_assessment_runner_fail_closed` | Fail-closed state gauge |
| `devhire_assessment_runner_judge0_configured` | Judge0 configuration gauge |

## Verification

Focused backend:

```powershell
mvn -pl common-lib,application-service,assessment-runner-service -am "-Dtest=CodeAssessmentServiceTest,CodeAssessmentControllerTest,CodeAssessmentGraderTest,AssessmentRunnerServiceTest" "-Dsurefire.failIfNoSpecifiedTests=false" test
```

Frontend:

```powershell
cd frontend
npm run typecheck
npm run e2e:preview
npm run e2e:preview:mobile
```

Runtime after Docker is up:

```powershell
.\scripts\code-assessment-smoke.ps1 -GatewayUrl http://localhost:8080
.\scripts\runtime-observability-smoke.ps1 -GatewayUrl http://localhost:8080
```

Live Judge0, when a runner is configured:

```powershell
$env:RUN_JUDGE0_SMOKE = "1"
.\scripts\judge0-smoke.ps1 -RunnerUrl http://localhost:8089
```

## Release Gate

Before promoting a release that changes assessment behavior, run:

```powershell
npm run typecheck
npm run e2e:preview
npm run e2e:preview:mobile
mvn -T1 test
.\scripts\api-compatibility.ps1 -ManifestOnly
docker compose config --quiet
kubectl kustomize deploy/k8s
```

For production-like compose, verify that config fails without `JUDGE0_BASE_URL` and passes when it is supplied. That is the intentional fail-closed guard.

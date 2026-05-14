# Code Assessment Runner Runbook

Use this runbook when candidate grading, Judge0 execution, or code-assessment health alerts need review.

## Scope

`application-service` owns the hiring domain: assignments, challenge versions, hidden cases, submissions, scoring, similarity, integrity, audit, and employer review. `assessment-runner-service` is an internal execution boundary that receives code plus test cases and returns verdict evidence. It must not own candidate records or expose hidden fixtures to the frontend.

## Operating Modes

| Environment | Runner mode | Expected behavior |
|---|---|---|
| Local frontend preview | Browser preview data | UI and E2E can run without backend services |
| Local Docker default | `deterministic` | Repeatable preview execution; not trusted production scoring |
| Production compose/Kubernetes | `judge0` | Requires `JUDGE0_BASE_URL`; missing config fails closed |
| Maintenance outage | `fail-closed` | Blocks trusted scoring while preserving evidence and health reason |

Production must never silently fall back to deterministic scoring.

## Health Checks

Check runner health directly:

```powershell
Invoke-RestMethod http://localhost:8089/internal/assessment-runs/health
```

Healthy production-like response should show:

- `status = UP`
- `mode = judge0`
- `judge0Configured = true`
- `failClosed = false`
- `queueDepth` near zero when idle
- `runnerVersion = devhire-runtime-v0.7`

If health is `DOWN` or `failClosed = true`, stop trusting new candidate scores until the reason is resolved.

## Smoke Tests

Gateway workflow smoke:

```powershell
.\scripts\code-assessment-smoke.ps1 -GatewayUrl http://localhost:8080
```

Use `http://localhost:18080` instead when running the CI/high-port Docker Desktop profile (`GATEWAY_HOST_PORT=18080`).

This covers employer assignment, candidate visible run, candidate final submit, hidden redaction, employer attempt history, employer review, and admin summary.

Live runner smoke:

```powershell
.\scripts\judge0-smoke.ps1 -RunnerUrl http://localhost:8089
```

This verifies runner health plus accepted, wrong-answer, compile-error, timeout, and policy-blocked Java cases.

Observability smoke:

```powershell
.\scripts\runtime-observability-smoke.ps1 -GatewayUrl http://localhost:8080
```

This scrapes `application-service`, `assessment-runner-service`, and the rest of the local stack for domain metrics.

## Alert Response

| Alert | First checks |
|---|---|
| `DevHireAssessmentRunnerFailClosed` | Verify `DEVHIRE_RUNNER_MODE`, `JUDGE0_BASE_URL`, runner logs, and `/internal/assessment-runs/health` |
| `DevHireAssessmentRunnerUnavailableSpike` | Check Judge0 availability, runner network policy, internal token route, and application-service runner client failures |
| `DevHireAssessmentRunnerCompileErrorSpike` | Check starter code, Java harness, active challenge version, and recent challenge publishes |
| `DevHireAssessmentRunnerTimeoutSpike` | Check Judge0 queue latency, time limits, infinite-loop submissions, and runner capacity |
| `DevHireAssessmentRunnerPolicyBlockedSpike` | Review policy rules and candidate code patterns; confirm no starter snippet violates sandbox policy |
| `DevHireAssessmentRunnerQueueDepthHigh` | Scale runner/Judge0 capacity or pause assignment volume |
| `DevHireCodeRunnerClientFailures` | Check service discovery, gateway/internal token configuration, and runner readiness |

## Redaction Checks

Candidate-facing payloads must not include:

- hidden `stdin`
- hidden `expected_output`
- hidden stdout/stderr
- hidden compile output
- hidden fixture names that disclose edge cases

Employer/admin review may show hidden pass/total aggregates and sanitized runtime metadata. Admin challenge authoring is the only surface that should expose full hidden fixture authoring data.

## Recovery

1. Stop new assignments if fail-closed or unavailable verdicts are active.
2. Confirm `assessment-runner-service` health and Judge0 connectivity.
3. Run `judge0-smoke.ps1` against the runner.
4. Run `code-assessment-smoke.ps1` through Gateway.
5. Check `/admin` assessment health and Prometheus runner panels.
6. Reopen or reassign impacted assessments only after runner health and smoke tests pass.

Do not manually edit raw scores. Use employer review state or explicit reopen/reassign workflows so the audit trail stays intact.

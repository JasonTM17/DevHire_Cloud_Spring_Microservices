# DevHire Cloud Documentation Index

This is the reviewer-facing map for DevHire Cloud. It separates current claims, verification commands, historical release evidence, and owner-action items so reviewers can inspect the project without reading every document in the repository.

## Start Here

| Need | Primary document | Purpose |
|---|---|---|
| One-page product and architecture overview | [Root README](../README.md) | First impression, flagship workflows, screenshots, and local commands |
| Current public state | [status](status.md) | Release, branch, runtime, Dependabot, and v1 posture |
| Curated evidence pack | [REVIEW_EVIDENCE](REVIEW_EVIDENCE.md) | Short proof path for recruiters and senior reviewers |
| Senior architecture path | [architecture review index](architecture-review-index.md) | Backend, DevOps, AI/product, and runtime review stations |
| Service map | [service catalog](service-catalog.md) | Ports, modules, ownership, dependencies, and operational checks |
| Runtime proof | [runtime acceptance matrix](runtime-acceptance-matrix.md) | Black-box commands mapped to platform claims |
| Security posture | [security evidence](security-evidence.md) | Secret handling, scans, auth, supply chain, and safe defaults |
| Code grading proof | [code assessment reviewer proof](code-assessment-reviewer-proof.md) | Candidate runner, hidden redaction, scoring, review, and admin health |
| UI/UX audit | [UI/UX audit](ui-ux-audit.md) | ITViec-inspired client marketplace, Code Studio redaction, admin/ops visual contract |
| Runner operations | [code assessment runner runbook](runbooks/code-assessment-runner.md) | Triage path for Judge0, fail-closed mode, metrics, and smoke tests |

## Current Release Narrative

| Topic | Document |
|---|---|
| Public release body | [release notes v0.5.1](release-notes/v0.5.1.md) |
| Public release evidence | [release evidence v0.5.1](release-evidence/v0.5.1.md) |
| Current development status | [status](status.md) |
| v0.6 Stitch and code-assessment consolidation | [pr stack v0.6](pr-stack-v0.6.md) |
| v1 roadmap, not released | [v1 reviewer guide](v1-reviewer-guide.md), [v1 production gap register](v1-production-gap-register.md) |

## Verification Gates

Run static and contract checks first:

```powershell
.\scripts\docs-quality.ps1
.\scripts\evidence-audit.ps1
.\scripts\api-compatibility.ps1 -ManifestOnly
docker compose config --quiet
kubectl kustomize deploy/k8s > $null
```

Run runtime checks after Docker is running:

```powershell
docker compose up -d --build
.\scripts\code-assessment-smoke.ps1 -GatewayUrl http://localhost:8080
.\scripts\runtime-observability-smoke.ps1 -GatewayUrl http://localhost:8080
.\scripts\ai-eval.ps1 -GatewayUrl http://localhost:8080
.\scripts\perf-suite.ps1 -GatewayUrl http://localhost:8080 -Scenario all -Vus 2 -Duration 10s -UseDocker
```

When local ports conflict, use the same high-port convention used by CI/runtime smoke:

```powershell
$env:POSTGRES_HOST_PORT="15432"
$env:GATEWAY_HOST_PORT="18080"
$env:FRONTEND_HOST_PORT="13001"
$env:AUTH_HOST_PORT="18081"
$env:USER_HOST_PORT="18082"
$env:COMPANY_HOST_PORT="18083"
$env:JOB_HOST_PORT="18084"
$env:APPLICATION_HOST_PORT="18085"
$env:NOTIFICATION_HOST_PORT="18086"
$env:AUDIT_HOST_PORT="18087"
$env:AI_HOST_PORT="18088"
$env:ASSESSMENT_RUNNER_HOST_PORT="18089"
docker compose up -d --build
.\scripts\code-assessment-smoke.ps1 -GatewayUrl http://localhost:18080
```

## Owner-Action Items

These items require repository owner credentials and should not be hidden behind optimistic README claims.

| Item | Current state as of 2026-05-14 | Action |
|---|---|---|
| Dependabot PR queue | 20 open Dependabot PRs. Curation dry-run classifies 11 safe-batch, 3 manual-review, and 6 defer-major; zero-noise reports 0 clean merge candidates until CI/runtime smoke are green. | Use a short-lived owner token with `.\scripts\dependabot-zero-noise.ps1 -Apply` only after CI/runtime smoke is green. |
| Branch and public facade governance | `master` is protected and public metadata is applied, but detailed protection reads may require owner scope. | Run `.\scripts\github-governance.ps1 -DryRun` and owner-token apply only when settings drift. |
| Docker Hub release promotion | Preview tags are verifiable; publishing a new release tag should wait for green CI and runtime smoke. | Run `.\scripts\dockerhub-image-verify.ps1` and release workflow after branch push. |
| GitHub Actions release blockers | Local parity for `AI Assistant Evaluation` and `Performance Smoke` passed on 2026-05-14; public workflow status updates after push. | Push the release branch, then rerun or watch the two workflow runs before Docker Hub promotion. |

## Documentation Standards

- Current-state pages must be truthful about blocked work, owner actions, and local-only evidence.
- Generated reports stay under `reports/` and are not committed.
- Historical release evidence can keep past counts and outcomes, but primary reviewer pages must point to current status.
- Screenshots and evidence must avoid secrets, raw tokens, raw hidden test payloads, and temporary local report data.
- `docs/PROGRESS.md` is an engineering diary, not the reviewer entrypoint.

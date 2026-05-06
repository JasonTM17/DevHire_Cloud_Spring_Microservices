# DevHire Cloud Review Evidence Pack

This is the short reviewer-facing evidence path. `docs/PROGRESS.md` remains an internal engineering diary; this file is the curated proof pack for recruiters, interviewers, and senior engineering reviewers.

## Public Release And Repo Facade

| Evidence | Status |
|---|---|
| Latest public release | `v0.4.6` is visible on GitHub |
| Current development evidence | `v0.5.1` runtime depth and coverage evidence is staged on PR #29; release tag waits for protected-branch merge and required review |
| GitHub About/Homepage/Topics | Applied through owner-authenticated GitHub API; 20 topics are set |
| Branch protection | Applied on `master`; public branch API confirms `protected=true`, and detailed protection reads are owner-token only |
| Dependabot posture | Zero-noise cleanup applied: open Dependabot PR count is 0; future updates are handled through scheduled curated batches |
| E2E posture | `cd frontend && npm run e2e:all` is self-starting and passed locally with 5 desktop + 2 mobile smoke tests |
| Coverage posture | Parent JaCoCo baseline raised to 35%; per-module gates now ratchet reviewer-critical modules including `api-gateway` at 50%, `job-service` at 54%, and `user-service` at 76% |
| Demo data posture | Synthetic portfolio volume seed adds 1,108 primary records across service-owned databases; see [demo-data.md](demo-data.md) and [data model strategy](data-model-and-seed-strategy.md) |
| Runtime observability posture | Domain metrics for funnel, notifications, audit, outbox, search, and AI are emitted and verified by `runtime-observability-smoke.ps1` |
| Deployment posture | Prod Helm avoids `latest`, requires secret refs, cloud policy audit passes, and Terraform validation is race-safe |
| Transparent gaps | Remaining production gaps are documented instead of hidden; see [remaining gaps and roadmap](remaining-gaps-and-roadmap.md) |
| v1 release posture | v1 reviewer, demo, release evidence, cloud evidence, runtime evidence, and gap-register commands are prepared for the final release path |

Latest hardening evidence: [v0.5.1 production runtime depth evidence](release-evidence/v0.5.1.md).

## What To Review First

| Time | Route |
|---:|---|
| 5 minutes | README first viewport, screenshots, [production scorecard](production-engineering-scorecard.md) |
| 15 minutes | [Service catalog](service-catalog.md), [architecture review index](architecture-review-index.md), [security evidence](security-evidence.md) |
| 30 minutes | `.\scripts\portfolio-verify.ps1 -Docs -Docker`, [runtime evidence](runtime-evidence-v0.4.md), [cloud readiness](cloud-readiness-review.md) |

## Verification Commands

```powershell
.\scripts\portfolio-verify.ps1 -Docs -Docker
.\scripts\docs-parity.ps1
.\scripts\evidence-manifest-verify.ps1
.\scripts\github-governance.ps1 -DryRun
.\scripts\github-check-contexts.ps1
.\scripts\github-facade-assert.ps1 -AllowOwnerActions
.\scripts\dependabot-curate.ps1 -DryRun
.\scripts\dependabot-zero-noise.ps1 -DryRun
.\scripts\public-portfolio-audit.ps1
.\scripts\github-workflow-status.ps1
.\scripts\terraform-race-smoke.ps1
.\scripts\cloud-policy-audit.ps1
.\scripts\cloud-verify.ps1
.\scripts\cloud-evidence-summary.ps1
.\scripts\demo-data-summary.ps1
.\scripts\demo-data-summary.ps1 -FromDocker -Aggregates
.\scripts\migration-smoke.ps1
.\scripts\runtime-observability-smoke.ps1 -GatewayUrl http://localhost:8080
.\scripts\portfolio-runtime-report.ps1 -GatewayUrl http://localhost:8080
.\scripts\v1-release-verify.ps1 -Cloud
.\scripts\v1-cloud-evidence.ps1
.\scripts\v1-demo-data-verify.ps1
```

Reviewer-friendly frontend browser proof:

```powershell
cd frontend
npm run e2e:all
```

Runtime proof when Docker is already running:

```powershell
.\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl http://localhost:8080
.\scripts\portfolio-demo-evidence.ps1 -StartStack -CaptureScreenshots -PromoteScreenshots
.\scripts\runtime-evidence-summary.ps1
```

## Evidence Map

| Claim | Evidence |
|---|---|
| Microservices are real boundaries | Maven modules, service-owned databases, Flyway migrations, [service catalog](service-catalog.md) |
| Security is not a README-only claim | JWT/refresh flow, gateway validation, Gitleaks, Trivy, CodeQL, SBOM, [security evidence](security-evidence.md) |
| Events are reliable | Kafka, transactional outbox, idempotent consumers, chaos scripts, runbooks |
| Operations are observable | Prometheus rules, Grafana SLO dashboard, Loki/Tempo/OTel, [observability evidence](observability-evidence.md) |
| Domain runtime data is observable | Recruitment funnel, notification delivery, audit ingestion, outbox, search, and AI metrics, [SLO docs](slo.md) |
| AI is controlled | Claude Haiku provider config, fallback mode, citations, tool traces, [AI safety](ai-safety.md) |
| Cloud is blueprint-safe | Helm, Argo CD, AWS Terraform blueprint, External Secrets, race-safe validation, [cloud completion scorecard](cloud-completion-scorecard.md) |
| Gaps are explicit | [Remaining gaps and roadmap](remaining-gaps-and-roadmap.md) separates portfolio evidence from real-production follow-ups |
| v1 release path is explicit | [v1 reviewer guide](v1-reviewer-guide.md), [v1 demo script](v1-demo-script.md), and [v1.0.0 release evidence](release-evidence/v1.0.0.md) define final acceptance |

## Owner-Applied State

The public facade owner actions have been applied through the local Git credential-backed owner token path:

- GitHub About description is set.
- Homepage points to the `v0.4.6` release.
- 20 topics are set.
- `master` branch protection is enabled after required check context audit passed.
- Deferred-major Dependabot PRs were closed with curation comments; the zero-noise pass closed/deferred the remaining queue without merging unreadable or risky updates.

Remaining owner/account-level item: GHCR public package visibility may still require account settings.

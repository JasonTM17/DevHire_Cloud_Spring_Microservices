# DevHire Cloud Review Evidence Pack

This is the curated proof pack for recruiters and senior engineering reviewers. `docs/PROGRESS.md` remains an engineering diary/archive and is intentionally not the primary reviewer path.

## Current Public State

| Evidence | Status |
|---|---|
| Latest public release | `v0.5.1` is visible on GitHub |
| Current development cycle | `0.6.0-SNAPSHOT` after the `v0.5.1` release |
| GitHub About/Homepage/Topics | Applied through owner-authenticated GitHub API |
| Branch protection | `master` is protected and release changes go through PR review |
| Dependabot posture | 0 open PRs after curated cleanup |
| Release notes | `docs/release-notes/v0.5.1.md` is the canonical release body |
| v1 posture | Roadmap and acceptance checklist only; no `v1.0.0` release is claimed |
| v0.6 Stitch/code-assessment stack | Merged into `master`; [pr-stack-v0.6.md](pr-stack-v0.6.md) is now the historical merge record |

See [status.md](status.md) for the single source of truth.

## Reviewer Path

| Time | Route |
|---:|---|
| 5 minutes | README first viewport, screenshots, [production scorecard](production-engineering-scorecard.md) |
| 15 minutes | [Service catalog](service-catalog.md), [architecture review index](architecture-review-index.md), [security evidence](security-evidence.md) |
| 30 minutes | `.\scripts\portfolio-verify.ps1 -Docs -Docker -Cloud`, [cloud readiness](cloud-readiness-review.md), [runtime matrix](runtime-acceptance-matrix.md) |

## Current Development Evidence

| Area | Evidence now present |
|---|---|
| Product workflow | Jobs page has keyword, skill, location, level, minimum salary, sorting, clear-filter, result total, and pagination controls. |
| Rich demo data | `portfolio-verify.ps1 -Docs` now runs `demo-data-summary.ps1 -Aggregates -Json` so the 1,108-row deterministic dataset and status/action distributions are part of reviewer verification. |
| Frontend preview | [frontend-preview-deploy.md](frontend-preview-deploy.md) documents Vercel as frontend-only preview; backend remains Spring Cloud Gateway plus Java services. |
| Code assessment flagship | [code-assessment-reviewer-proof.md](code-assessment-reviewer-proof.md) documents the 5-minute flow: candidate runs visible cases, submits code, hidden tests score server-side, integrity/similarity risk appears, employer reviews, and admin sees runner health. |
| Branch governance | [pr-stack-v0.6.md](pr-stack-v0.6.md) records the completed v0.6 merge and branch cleanup; `master` protection is restored. |
| Gateway observability | `api-gateway` emits `devhire_gateway_requests_total`, `devhire_gateway_request_latency_seconds`, and `devhire_gateway_rate_limited_total` by route/status. |
| Runtime observability smoke | `runtime-observability-smoke.ps1` now checks Gateway custom metrics together with recruitment, notification, audit, search, AI, and outbox metrics. |
| SLO alerts | Prometheus rules include Gateway route p95 latency and route-level rate-limit spike alerts. |
| Stitch visual QA | Playwright is the official visual evidence path; Browser Use is optional for local visual inspection when the in-app browser runtime is available. v0.6.7 adds route-matrix screenshots, broader mobile checks, refreshed Stitch evidence, and a shared primary-evidence denylist. |

## Visual Evidence

The reviewer-facing screenshots are committed under `docs/screenshots/` and tracked by [evidence-manifest.json](evidence-manifest.json). The current set covers product, runtime, and operations evidence:

| Category | Screenshots |
|---|---|
| Product | `jobs-page.png`, `job-detail.png`, `candidate-dashboard.png`, `employer-dashboard.png`, `admin-dashboard.png`, `assistant-page.png` |
| Stitch full app | `stitch/client-jobs.png`, `stitch/client-job-detail.png`, `stitch/company-profile.png`, `stitch/candidate-assessments.png`, `stitch/employer-pipeline.png`, `stitch/admin-control-plane.png`, `stitch/admin-ai-ops.png`, `stitch/platform-observability.png`, `stitch/platform-cloud.png`, `stitch/platform-releases.png` |
| Runtime | `docker-runtime-jobs.png`, `ops-openapi-job-service.png`, `ops-mailpit.png` |
| Observability | `ops-prometheus-rules.png`, `ops-grafana-slo.png`, `ops-ai-provider.png` |

Primary screenshots must not contain raw IDs, `UNKNOWN`, loading-only panels, offline/provider-backup banners, smoke labels, or mojibake. This is enforced by Playwright guards and `scripts/visual-evidence-audit.ps1`.

## Verification Commands

```powershell
.\scripts\version-consistency.ps1
.\scripts\docs-parity.ps1
.\scripts\evidence-manifest-verify.ps1
.\scripts\repository-health.ps1
.\scripts\github-workflow-status.ps1 -Branch master -RequireGreen
.\scripts\portfolio-verify.ps1 -Docs -Docker -Cloud
```

Runtime proof when Docker is available:

```powershell
docker compose up -d --build
.\scripts\runtime-observability-smoke.ps1 -GatewayUrl http://localhost:8080
.\scripts\portfolio-runtime-report.ps1 -GatewayUrl http://localhost:8080
```

## Evidence Map

| Claim | Evidence |
|---|---|
| Microservices are real boundaries | Maven modules, service-owned databases, Flyway migrations, [service catalog](service-catalog.md) |
| Security is engineered | JWT/refresh flow, gateway validation, Gitleaks, Trivy, CodeQL, SBOM, [security evidence](security-evidence.md) |
| Events are reliable | Kafka, transactional outbox, idempotent consumers, chaos scripts, runbooks |
| Operations are observable | Prometheus rules, Grafana dashboards, Loki/Tempo/OTel, [observability evidence](observability-evidence.md) |
| Domain runtime data is observable | Recruitment funnel, notification delivery, audit ingestion, outbox, search, and AI metrics, [SLO docs](slo.md) |
| AI is controlled | Claude Haiku provider config, deterministic fallback, citations, tool traces, [AI safety](ai-safety.md) |
| Candidate code grading is reviewer-safe | Deterministic static rubric, redacted list/detail API boundary, audit metadata, and [code assessment reviewer proof](code-assessment-reviewer-proof.md) |
| Cloud is blueprint-safe | Helm, Argo CD, AWS Terraform blueprint, External Secrets, race-safe validation, [cloud completion scorecard](cloud-completion-scorecard.md) |
| Gaps are explicit | [Remaining gaps and roadmap](remaining-gaps-and-roadmap.md) separates portfolio evidence from real-production follow-ups |
| v1 path is explicit | [v1 reviewer guide](v1-reviewer-guide.md), [v1 demo script](v1-demo-script.md), and [v1 acceptance checklist](release-evidence/v1.0.0.md) define future acceptance |

## Historical Evidence

Older release evidence remains in `docs/release-evidence/` for auditability. Reviewer-facing docs should start from `v0.5.1` and only open older evidence when checking project history.

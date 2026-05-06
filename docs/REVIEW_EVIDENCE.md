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

See [status.md](status.md) for the single source of truth.

## Reviewer Path

| Time | Route |
|---:|---|
| 5 minutes | README first viewport, screenshots, [production scorecard](production-engineering-scorecard.md) |
| 15 minutes | [Service catalog](service-catalog.md), [architecture review index](architecture-review-index.md), [security evidence](security-evidence.md) |
| 30 minutes | `.\scripts\portfolio-verify.ps1 -Docs -Docker -Cloud`, [cloud readiness](cloud-readiness-review.md), [runtime matrix](runtime-acceptance-matrix.md) |

## Verification Commands

```powershell
.\scripts\version-consistency.ps1
.\scripts\docs-parity.ps1
.\scripts\evidence-manifest-verify.ps1
.\scripts\repository-health.ps1
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
| Cloud is blueprint-safe | Helm, Argo CD, AWS Terraform blueprint, External Secrets, race-safe validation, [cloud completion scorecard](cloud-completion-scorecard.md) |
| Gaps are explicit | [Remaining gaps and roadmap](remaining-gaps-and-roadmap.md) separates portfolio evidence from real-production follow-ups |
| v1 path is explicit | [v1 reviewer guide](v1-reviewer-guide.md), [v1 demo script](v1-demo-script.md), and [v1 acceptance checklist](release-evidence/v1.0.0.md) define future acceptance |

## Historical Evidence

Older release evidence remains in `docs/release-evidence/` for auditability. Reviewer-facing docs should start from `v0.5.1` and only open older evidence when checking project history.

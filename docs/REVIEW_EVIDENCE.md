# DevHire Cloud Review Evidence Pack

This is the short reviewer-facing evidence path. `docs/PROGRESS.md` remains an internal engineering diary; this file is the curated proof pack for recruiters, interviewers, and senior engineering reviewers.

## Public Release And Repo Facade

| Evidence | Status |
|---|---|
| Latest public release | `v0.3.0` is visible on GitHub |
| Current development evidence | `v0.4.6` public credibility, self-starting E2E, and repository-facade gates are committed on `master` |
| GitHub About/Homepage/Topics | Owner action required until `Repository Governance -> apply-metadata` and `verify-only` pass |
| Branch protection | Owner action required until `Repository Governance -> apply-branch-protection` and `verify-only` pass |
| Dependabot posture | 20 open PRs are categorized: 11 safe-batch, 8 deferred-major, 1 manual-review; curation workflow can close deferred majors |
| E2E posture | `cd frontend && npm run e2e:all` is self-starting and passed locally with 5 desktop + 2 mobile smoke tests |
| Coverage posture | Parent JaCoCo baseline raised to 35%; per-module script thresholds ratchet current measured modules |
| Deployment posture | Prod Helm avoids `latest`, requires secret refs, and security image scans fail actionable HIGH/CRITICAL findings |

Latest hardening evidence: [v0.4.6 public credibility evidence](release-evidence/v0.4.6.md).

## What To Review First

| Time | Route |
|---:|---|
| 5 minutes | README first viewport, screenshots, [production scorecard](production-engineering-scorecard.md) |
| 15 minutes | [Service catalog](service-catalog.md), [architecture review index](architecture-review-index.md), [security evidence](security-evidence.md) |
| 30 minutes | `.\scripts\portfolio-verify.ps1 -Docs -Docker`, [runtime evidence](runtime-evidence-v0.4.md), [cloud readiness](cloud-readiness-review.md) |

## Verification Commands

```powershell
.\scripts\portfolio-verify.ps1 -Docs -Docker
.\scripts\evidence-manifest-verify.ps1
.\scripts\github-governance.ps1 -DryRun
.\scripts\github-check-contexts.ps1
.\scripts\github-facade-assert.ps1 -AllowOwnerActions
.\scripts\dependabot-curate.ps1 -DryRun
.\scripts\public-portfolio-audit.ps1
```

Reviewer-friendly frontend browser proof:

```powershell
cd frontend
npm run e2e:all
```

Runtime proof when Docker is already running:

```powershell
.\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl http://localhost:8080
.\scripts\runtime-evidence-summary.ps1
```

## Evidence Map

| Claim | Evidence |
|---|---|
| Microservices are real boundaries | Maven modules, service-owned databases, Flyway migrations, [service catalog](service-catalog.md) |
| Security is not a README-only claim | JWT/refresh flow, gateway validation, Gitleaks, Trivy, CodeQL, SBOM, [security evidence](security-evidence.md) |
| Events are reliable | Kafka, transactional outbox, idempotent consumers, chaos scripts, runbooks |
| Operations are observable | Prometheus rules, Grafana SLO dashboard, Loki/Tempo/OTel, [observability evidence](observability-evidence.md) |
| AI is controlled | Claude Haiku provider config, fallback mode, citations, tool traces, [AI safety](ai-safety.md) |
| Cloud is blueprint-safe | Helm, Argo CD, AWS Terraform blueprint, External Secrets, [cloud readiness review](cloud-readiness-review.md) |

## Known Owner-Only Gaps

The following cannot be completed from repository code alone:

- GitHub About/Homepage/Topics require owner token or UI permission.
- `master` branch protection requires repository administration permission.
- GHCR public package visibility may require owner account settings.

The apply path is documented in [GitHub governance](github-governance.md) and [GitHub owner actions](github-owner-actions.md). The project does not claim these are applied until public API verification confirms them.

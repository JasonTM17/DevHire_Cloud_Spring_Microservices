# DevHire Cloud Status

This page is the single source of truth for the current public state of DevHire Cloud.

| Signal | Current value |
|---|---|
| Latest public release | `v0.5.1` |
| GitHub release | https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.5.1 |
| Default branch | `master` |
| Branch protection | Enabled |
| Open pull requests | Active v0.6 Stitch redesign stack: #43 is green and waiting for required review; v0.6.4/v0.6.5/v0.6.6/v0.6.7 are stacked until #43 merges |
| Dependabot queue | 0 open PRs after curated cleanup |
| Maven development version | `0.6.0-SNAPSHOT` |
| Frontend development version | `0.6.0` |
| Helm chart version | `0.6.0` |
| Cloud posture | AWS blueprint apply-ready; no `terraform apply` has been run |
| Runtime posture | Local Docker Compose runtime with smoke, observability, E2E, and data evidence |
| v1 posture | Roadmap and acceptance checklist only; no `v1.0.0` tag exists or should be claimed |

## Current Development Highlights

| Track | Current evidence |
|---|---|
| Product UX | Reviewer-facing jobs workflow now includes richer filters, sorting, totals, and pagination. |
| Stitch v0.6 | PR #43 is green and waiting for required review; the stacked v0.6.7 work adds full-app screenshot evidence and flagship code assessment proof. |
| Code assessment | Candidate code submissions now have deterministic rubric scoring, attempt metadata, code hash, rubric versioning, redacted list/detail API boundaries, employer review dossier, admin health summary, due-date enforcement, and static risk flags. |
| Frontend deploy | Optional Vercel preview path exists for `frontend/` only; Java backend deployment remains Docker/AWS blueprint. |
| Gateway operations | Gateway emits route request, latency, and rate-limit metrics with Prometheus alert coverage. |
| Runtime proof | Runtime observability smoke checks Gateway metrics plus domain KPI metrics when Docker is running. |

## Reviewer Path

1. Start with [README](../README.md), [English README](README_EN.md), or [Japanese README](README_JA.md).
2. Review [REVIEW_EVIDENCE](REVIEW_EVIDENCE.md) for the curated proof pack.
3. Review [v0.5.1 release evidence](release-evidence/v0.5.1.md) and [v0.5.1 release notes](release-notes/v0.5.1.md).
4. Review [production engineering scorecard](production-engineering-scorecard.md).
5. Use [v1 reviewer guide](v1-reviewer-guide.md) only as the future roadmap toward `v1.0.0`.

## Verification

```powershell
.\scripts\version-consistency.ps1
.\scripts\repository-health.ps1
.\scripts\portfolio-verify.ps1 -Docs -Docker -Cloud
```

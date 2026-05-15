# DevHire Cloud Status

This page is the single source of truth for the current public state of DevHire Cloud.

| Signal | Current value |
|---|---|
| Latest public release | `v0.6.0` |
| GitHub release | https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.6.0 |
| Default branch | `master` |
| Branch protection | Enabled |
| Open pull requests | 0 open PRs after the 2026-05-14 Dependabot zero-noise apply |
| Dependabot queue | 20 stale/behind/risky Dependabot PRs were commented, closed, and pruned because zero-noise found 0 clean merge candidates; no dependency PR was force-merged into the release |
| Maven development version | `0.6.0-SNAPSHOT` release cut; next snapshot bump is post-release maintenance |
| Frontend development version | `0.6.0` |
| Helm chart version | `0.6.0` |
| Cloud posture | AWS blueprint apply-ready; no `terraform apply` has been run |
| Runtime posture | Local Docker Compose runtime with smoke, observability, E2E, and data evidence |
| CI parity posture | `AI Assistant Evaluation`, `Performance Smoke`, CI, E2E Smoke, Docker Images, CodeQL, Security, and Documentation are green on `master` after the 2026-05-14 close-out |
| v1 posture | Roadmap and acceptance checklist only; no `v1.0.0` tag exists or should be claimed |

## Current Development Highlights

| Track | Current evidence |
|---|---|
| Product UX | Reviewer-facing jobs workflow now includes richer filters, sorting, totals, and pagination. |
| Stitch v0.6 | Merged into `master`; full-app screenshot evidence and flagship code assessment proof are part of the default branch. |
| Code assessment | Candidate code submissions now use Java `CandidateSolution.solve(String input)`, visible/custom runs, hidden server-side grading, 75/25 runtime-plus-static scoring, attempt metadata, code hash, rubric versioning, redacted candidate boundaries, employer review dossier, admin runner health, due-date enforcement, and static risk flags. |
| Frontend deploy | Optional Vercel preview path exists for `frontend/` only; Java backend deployment remains Docker/AWS blueprint. |
| Gateway operations | Gateway emits route request, latency, and rate-limit metrics with Prometheus alert coverage. |
| Runtime proof | Runtime observability smoke checks Gateway metrics plus domain KPI metrics when Docker is running; code-assessment smoke covers assign, visible/custom run, hidden submit redaction, employer review, and admin summary. |

## Release Close-Out

| Signal | Evidence |
|---|---|
| Close-out PRs | v0.6 close-out, final branch cleanup, and documentation polish merged into `master` on 2026-05-14 |
| Current master head | Verify with `git log -1 --oneline` and `gh run list --branch master`; current-state docs avoid hardcoding a moving head SHA |
| Branch protection | Restored after merge; required reviews and required status checks remain enabled |
| Final docs gates | `docs-quality.ps1`, `evidence-audit.ps1`, and `git diff --check` passed after `master` sync |
| Dependency posture | Dependabot queue is zero-noise clean: no open PRs, no remote branches pending merge, and risky updates deferred to a future maintenance window |

## Reviewer Path

1. Start with [README](../README.md), [English README](README_EN.md), or [Japanese README](README_JA.md).
2. Use [documentation index](INDEX.md) to choose the right review path.
3. Review [REVIEW_EVIDENCE](REVIEW_EVIDENCE.md) for the curated proof pack.
4. Review [v0.6.0 release evidence](release-evidence/v0.6.0.md) and [v0.6.0 release notes](release-notes/v0.6.0.md).
5. Review the [v0.6 merge record](pr-stack-v0.6.md) to understand how the Stitch/code-assessment stack was consolidated.
6. Review [production engineering scorecard](production-engineering-scorecard.md).
7. Use [v1 reviewer guide](v1-reviewer-guide.md) only as the future roadmap toward `v1.0.0`.

## Verification

```powershell
.\scripts\version-consistency.ps1
.\scripts\repository-health.ps1
.\scripts\portfolio-verify.ps1 -Docs -Docker -Cloud
```

# DevHire v0.6 PR Stack

This document keeps the active v0.6 Stitch and code-assessment work understandable while protected branch review is doing its job. The stack is intentional; it prevents a large UI/backend/security change from landing as one opaque pull request.

## Current Stack

| Order | PR | Scope | Base | Status |
|---:|---|---|---|---|
| 1 | [#43](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/pull/43) | Stitch client/admin redesign baseline | `master` | Green, waiting for required review |
| 2 | [#46](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/pull/46) | Code assessment grading workflow | `v0.6-stitch-client-admin-redesign` | Green stacked follow-up |
| 3 | [#47](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/pull/47) | Employer code review decision coverage | `v0.6.4-code-assessment-grading` | Green stacked follow-up |
| 4 | [#48](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/pull/48) | Code assessment review polish | `v0.6.5-code-assessment-review-polish` | Green stacked follow-up |
| 5 | [#49](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/pull/49) | Code grading flagship workflow | `v0.6.6-stitch-code-assessment-completion` | Green stacked follow-up |

## Merge Policy

The root blocker is not a technical failure. PR #43 targets `master`, and `master` requires a real approving review. We do not direct-push to `master`, use admin bypass, or weaken branch protection to speed this up.

After PR #43 receives approval and merges:

1. Retarget PR #46 to `master`, wait for checks, then merge through review.
2. Retarget PR #47 to `master`, wait for checks, then merge through review.
3. Retarget PR #48 to `master`, wait for checks, then merge through review.
4. Retarget PR #49 to `master`, wait for checks, then merge through review.
5. Re-run the public evidence gates and update release notes only after the stack is on `master`.

## Why This Is Not Version Sprawl

The public release remains `v0.5.1`; the active development line remains `0.6.0-SNAPSHOT`. The v0.6 branch stack is review staging for one product slice: Stitch full-app redesign plus candidate code assessment as the flagship feature.

The reviewer-facing source of truth is:

- [status.md](status.md)
- [REVIEW_EVIDENCE.md](REVIEW_EVIDENCE.md)
- [code-assessment-reviewer-proof.md](code-assessment-reviewer-proof.md)
- this PR stack page

## Verification

```powershell
.\scripts\pr-stack-status.ps1
.\scripts\github-workflow-status.ps1 -Branch master -RequireGreen
```

`pr-stack-status.ps1` writes sanitized Markdown and JSON reports under ignored `reports/pr-stack-status/`.

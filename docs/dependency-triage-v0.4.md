# Dependency Triage v0.4

Generated from `scripts/dependabot-inventory.ps1` on 2026-05-04. The generated raw inventory remains under `reports/dependabot/` and is intentionally not committed.

## Current Inventory

| Category | Open PRs | Default decision |
|---|---:|---|
| GitHub Actions | 1 | Merge as the first safe batch after workflow lint and CI. |
| Docker base images | 9 | Batch by image family; do not merge all at once. |
| Maven | 4 | Split patch/minor from major compatibility work. |
| npm/frontend | 3 | Merge Playwright/tooling separately from Node 25 runtime changes. |
| Terraform | 3 | Defer AWS provider 6.x until a dedicated migration review. |

## Curated Batch Plan

| Batch | PRs | Action | Required gates |
|---|---|---|---|
| Actions tooling | `#22` | Candidate for first merge if workflow lint and CI are green. | actionlint, Documentation, Security, CI |
| Docker backend base images | `#2`-`#9`, `#20` | Review duplicates, keep the newest equivalent PR, close superseded ones, merge one backend image batch at a time. | Docker Images, Security, CI |
| Frontend tooling | `#11` | Candidate after frontend typecheck/build and Playwright smoke. | `npm run typecheck`, `npm run build`, `npm run e2e:mobile` |
| Maven low-risk candidate | `#14` | Review JJWT 0.13.0 changelog before merge; treat as backend compatibility work, not automatic. | `mvn -T1 clean verify`, API compatibility manifest |
| Maven major/compatibility | `#10`, `#13`, `#16` | Defer to dedicated migration PRs because Spring platform, Testcontainers 2.x, and Springdoc 3.x can affect runtime/test contracts. | Full Maven verify, Docker runtime smoke, OpenAPI verify |
| Frontend/Node major | `#1`, `#12` | Defer until Node 25 support is intentionally adopted across Docker image, local frontend, and CI. | Frontend build, Docker image build, Playwright smoke |
| Terraform AWS provider major | `#17`, `#18`, `#19` | Defer until AWS provider 6.x migration notes are reviewed for dev/staging/prod together. | `terraform init -backend=false`, `terraform validate`, Checkov/Trivy config scan |

## Non-Goals

- Do not merge all Dependabot PRs in one commit.
- Do not merge Terraform AWS provider 6.x without checking state/resource behavior.
- Do not merge Node 25 runtime changes only because Dependabot opened them.
- Do not require real AWS credentials for dependency triage.

## Reviewer Evidence

This triage proves the portfolio is maintained deliberately:

- safe automation is separated from runtime majors,
- duplicate Docker image PRs are handled as a batch,
- backend compatibility changes require backend and API gates,
- generated inventory stays ignored and sanitized.


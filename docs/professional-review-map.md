# DevHire Cloud Professional Review Map

This map is the reviewer entry point. It keeps recruiters, hiring managers, and senior engineers out of the archival docs and points them at the current public evidence on `master`.

## 5-Minute Review

Use this path for a fast, high-signal screen.

1. Open [README](../README.md) and scan the 30-second reviewer brief, architecture proof table, cloud matrix, and screenshots.
2. Open [status](status.md) to confirm the current release, development cycle, branch protection, and v0.6 consolidation state.
3. Open [review evidence](REVIEW_EVIDENCE.md) for the curated proof pack and current verification commands.
4. Open [code assessment reviewer proof](code-assessment-reviewer-proof.md) to see the flagship candidate, employer, and admin/ops workflow.
5. Check `.github/workflows/` for CI, Docker, release image publishing, security, documentation, E2E, and Terraform workflows.

Expected takeaway: DevHire Cloud is presented as an evidence-backed production engineering portfolio, not a screenshot-only demo.

## 15-Minute Engineering Review

Use this path when reviewing backend, product, and operations depth.

1. Read [service catalog](service-catalog.md), [architecture review index](architecture-review-index.md), [architecture](architecture.md), and [portfolio case study](portfolio-case-study.md).
2. Inspect `api-gateway`, `auth-service`, `job-service`, `application-service`, `assessment-runner-service`, `notification-service`, `audit-service`, and `ai-service`.
3. Open [SLO documentation](slo.md), [observability evidence](observability-evidence.md), [security evidence](security-evidence.md), [external secrets](external-secrets.md), and the runbooks under `docs/runbooks/`.
4. Review `scripts/verify.ps1`, `scripts/api-smoke.ps1`, `scripts/runtime-observability-smoke.ps1`, `scripts/chaos-smoke.ps1`, and `scripts/terraform-validate.ps1`.
5. Review [v0.6 UI redesign](ui-redesign-v0.6.md), [design system](design-system.md), and the Stitch screenshots under `docs/screenshots/stitch/`.

Expected takeaway: the project demonstrates service boundaries, event-driven workflow, role-aware product UX, observability, security, and operations thinking.

## 30-Minute Technical Review

Use this path for a senior-level validation pass.

1. Run `mvn -T1 clean verify`.
2. Run `cd frontend; npm run typecheck; npm run build; npm run e2e:all`.
3. Run `docker compose config --quiet`.
4. If Docker resources are available, run `docker compose up -d --build`, then `.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080`.
5. Run `.\scripts\docs-quality.ps1`, `.\scripts\docs-parity.ps1`, `.\scripts\visual-evidence-audit.ps1 -ScreenshotsDir docs/screenshots`, and `.\scripts\stitch-pixel-diff.ps1` after regenerating Stitch route screenshots.
6. Review `deploy/helm/devhire-cloud`, `deploy/terraform/aws`, [cloud readiness](cloud-readiness-review.md), and [cloud completion scorecard](cloud-completion-scorecard.md).
7. Review [container images](container-images.md), dependency scanning, SBOM generation, and release image workflow before judging supply-chain maturity.

Expected takeaway: the project can be built, tested, inspected, and operated through repeatable engineering gates.

## Review Caveats

- AWS deployment is intentionally blueprint-only unless real credentials and budget are provided.
- Gmail, Anthropic, Docker Hub, and cloud provider secrets are never committed; local demos use safe fallback or sandbox profiles.
- Generated reports under `reports/`, backups, Terraform state, kubeconfigs, `.env`, and frontend runtime artifacts are intentionally ignored.

# DevHire Cloud Professional Review Map

This map helps a recruiter, senior engineer, or hiring manager review DevHire Cloud without getting lost in the size of the repository.

## 5-Minute Review

Use this path when you only want a fast signal.

1. Open `README.md` and scan the 30-second review, production proof table, and screenshots.
2. Open `docs/release-evidence/v0.4.0.md` and confirm that CI, Docker, Security, Documentation, runtime, and evidence gates are tracked.
3. Open `docs/github-owner-actions.md` and check whether About, topics, release, and branch protection are configured on GitHub.
4. Check `.github/workflows/` to confirm the repository has real CI/CD workflows, not only local scripts.

Expected takeaway: the project is built as a production/platform portfolio with real verification evidence.

## 15-Minute Review

Use this path when reviewing backend and DevOps depth.

1. Read `docs/service-catalog.md`, `docs/architecture-review-index.md`, `docs/architecture.md`, and `docs/portfolio-case-study.md`.
2. Inspect `api-gateway`, `auth-service`, `job-service`, `application-service`, `notification-service`, `audit-service`, and `ai-service`.
3. Open `docs/slo.md`, `docs/observability-evidence.md`, `docs/security.md`, `docs/external-secrets.md`, and `docs/runbooks/backup-restore.md`.
4. Review `scripts/verify.ps1`, `scripts/api-smoke.ps1`, `scripts/chaos-smoke.ps1`, and `scripts/terraform-validate.ps1`.
5. Scan `docs/recruiter-review-guide.md` for the demo flow and suggested AI assistant prompts.

Expected takeaway: the project demonstrates service boundaries, event-driven workflow, observability, security, and operations thinking.

## 30-Minute Review

Use this path for a senior-level technical review.

1. Run `mvn -T1 clean verify` and `.\scripts\check-coverage.ps1`.
2. Run `cd frontend && npm run typecheck && npm run build`.
3. Run `docker compose config --quiet`.
4. If Docker resources are available, run `docker compose up -d --build`, then `.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080`.
5. Review `deploy/helm/devhire-cloud`, `deploy/terraform/aws`, and `docs/cloud-readiness-review.md` for production blueprint maturity.
6. Review Dependabot and security workflow evidence before judging supply-chain maturity.

Expected takeaway: the project can be built, tested, inspected, and operated through repeatable engineering gates.

## Review Caveats

- AWS deployment is intentionally blueprint-only unless real credentials and budget are provided.
- Gmail and Anthropic secrets are never committed; local demos use safe fallback or sandbox profiles.
- Generated reports under `reports/`, backups, Terraform state, kubeconfigs, and `.env` files are intentionally ignored.

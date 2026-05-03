# DevHire Cloud v0.2 Release Checklist

This checklist turns the portfolio repository into an operations review package. It is intentionally manual-friendly because the AWS blueprint is not applied automatically.

## Scope

- Release version: `v0.2.0`
- Release theme: operations-grade portfolio hardening
- Target branch: `master`
- Deployment target: local Docker Compose plus blueprint-only Kubernetes, Helm, GitOps, and Terraform evidence

## Required Gates

- [ ] `mvn -T1 clean verify`
- [ ] `cd frontend && npm run typecheck && npm run build && npm run e2e`
- [ ] `docker compose config --quiet`
- [ ] `docker compose up -d --build`
- [ ] `.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080`
- [ ] `.\scripts\ai-eval.ps1 -GatewayUrl http://localhost:8080`
- [ ] `.\scripts\email-smoke.ps1 -GatewayUrl http://localhost:8080 -MailpitUrl http://localhost:8025`
- [ ] `.\scripts\perf-suite.ps1 -GatewayUrl http://localhost:8080 -Scenario all -Vus 5 -Duration 30s -UseDocker`
- [ ] `.\scripts\chaos-smoke.ps1 -GatewayUrl http://localhost:8080 -Scenario opensearch -Recover`
- [ ] `.\scripts\chaos-smoke.ps1 -GatewayUrl http://localhost:8080 -Scenario kafka -Recover`
- [ ] `.\scripts\chaos-smoke.ps1 -GatewayUrl http://localhost:8080 -Scenario ai -Recover`
- [ ] `.\scripts\chaos-smoke.ps1 -GatewayUrl http://localhost:8080 -Scenario mail -Recover`
- [ ] `.\scripts\openapi-verify.ps1 -GatewayUrl http://localhost:8080`
- [ ] `.\scripts\terraform-validate.ps1`
- [ ] Helm render for local, staging, prod, aws-staging, and aws-prod values
- [ ] Prometheus `promtool` config/rule validation
- [ ] `actionlint`
- [ ] `gitleaks`
- [ ] Trivy filesystem/config scan
- [ ] `.\scripts\docs-quality.ps1`

## Review Evidence

- [ ] Screenshots refreshed in `docs/screenshots/`
- [ ] `docs/PROGRESS.md` lists the verification commands and honest limitations
- [ ] `docs/release-notes/v0.2.0.md` summarizes shipped scope
- [ ] `docs/recruiter-review-guide.md` explains how to inspect the repository in under 20 minutes
- [ ] No secrets, generated plans, Terraform state, backup artifacts, logs, or report output are committed

## Manual GitHub Settings

- [ ] Repository About description is filled from `docs/github-profile.md`
- [ ] Topics are configured from `docs/github-profile.md`
- [ ] `master` branch protection is enabled
- [ ] Required checks include CI, Docker, security, Terraform, docs, and smoke gates
- [ ] Dependabot alerts and secret scanning are enabled where available

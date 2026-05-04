# Recruiter Review Guide

This guide helps a recruiter or senior engineer review DevHire Cloud in 15-20 minutes without reading every file.

## 1. Start With The Case Study

Read:

- `README.md`
- `docs/README_EN.md`
- `docs/portfolio-case-study.md`
- `docs/professional-review-map.md`
- `docs/service-catalog.md`
- `docs/architecture-review-index.md`
- `docs/evidence-manifest.md`
- `docs/release-notes/v0.3.0.md`
- `docs/release-evidence/v0.3.0.md`

Look for:

- clear microservice boundaries,
- service-owned databases,
- event-driven communication,
- production verification evidence.

## 2. Inspect Architecture And Service Boundaries

Open:

- `docs/architecture.md`
- `common-lib/`
- `api-gateway/`
- `auth-service/`
- `job-service/`
- `application-service/`
- `notification-service/`
- `audit-service/`
- `ai-service/`

Review signals:

- controllers do not return JPA entities,
- DTOs are separate from entities,
- Flyway migrations live per service,
- no service reads another service database directly,
- contracts/events are versioned and tested.

## 3. Run The Fast Local Proof

For a short static gate:

```powershell
.\scripts\portfolio-verify.ps1 -Docs -Docker
.\scripts\evidence-audit.ps1
.\scripts\repo-hygiene.ps1
```

For runtime proof after the Docker stack is up:

```powershell
docker compose up -d --build
.\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl http://localhost:8080
```

The portfolio verifier writes JSON and Markdown reports under `reports/portfolio-verify/`; the directory is intentionally ignored because it contains generated runtime evidence.

Useful URLs:

- Frontend: `http://localhost:3001`
- Assistant: `http://localhost:3001/assistant`
- Gateway health: `http://localhost:8080/actuator/health`
- Mailpit: `http://localhost:8025`
- Grafana: `http://localhost:3000`

## 4. Review Operations Evidence

Open:

- `docs/slo.md`
- `docs/email-sandbox.md`
- `docs/external-secrets.md`
- `docs/cloud-readiness-review.md`
- `docs/runtime-reliability-review.md`
- `docs/runbooks/backup-restore.md`
- `docs/runbooks/incident-response.md`
- `docs/runbooks/alert-response.md`
- `docs/runbooks/kafka-outbox-incident.md`
- `docs/runbooks/opensearch-degradation.md`
- `docs/runbooks/smtp-provider-outage.md`
- `docs/runbooks/ai-provider-outage.md`
- `docs/runbooks/database-restore-drill.md`
- `docs/release-evidence/v0.3.0.md`

What to look for:

- SLO and alert coverage,
- email sandbox and real SMTP secret policy,
- backup/restore guardrails,
- chaos smoke scenarios,
- External Secrets and GitOps wiring,
- release evidence checklist.

## 5. Review CI/CD And Supply Chain

Open:

- `.github/workflows/ci.yml`
- `.github/workflows/docker.yml`
- `.github/workflows/security.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/scorecard.yml`
- `.github/workflows/terraform.yml`
- `.github/workflows/performance.yml`
- `.github/workflows/e2e.yml`
- `.github/dependabot.yml`

Review signals:

- Maven verify runs real tests,
- Docker images are built through a matrix,
- Gitleaks and Trivy are present,
- CodeQL and Scorecard evidence is present,
- Terraform validates without apply,
- k6 and Playwright run as portfolio gates,
- Dependabot covers Maven, npm, Docker, GitHub Actions, and Terraform.

## 6. Ask The AI Assistant

Try these prompts:

- `Explain this microservices platform to a recruiter`
- `What production risks does this system handle?`
- `Show the 10-minute demo path`
- `Find senior Java jobs matching Kafka and AWS`

The assistant should return citations and tool traces. If no Anthropic key is configured, deterministic fallback mode is expected and safe for demos.

Also try:

- `How do you handle prompt injection and secret safety?`

The assistant should refuse secret-exfiltration style prompts and still show citations/tool traces.

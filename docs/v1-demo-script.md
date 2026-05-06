# DevHire Cloud v1 Demo Script

This script is designed for a 10-minute portfolio walkthrough.

## Before The Demo

Run the fast static gate:

```powershell
.\scripts\v1-release-verify.ps1 -Cloud
```

If Docker runtime will be shown:

```powershell
docker compose up -d --build
.\scripts\v1-runtime-evidence.ps1 -GatewayUrl http://localhost:8080
```

## Minute 0-1: Positioning

Message:

> DevHire Cloud is a production-grade microservices portfolio for a recruitment platform. It demonstrates service boundaries, security, event reliability, search, observability, cloud blueprinting, AI assistance, CI/CD, and reviewer evidence.

Open:

- `README.md`
- [Review evidence](REVIEW_EVIDENCE.md)
- [v1 reviewer guide](v1-reviewer-guide.md)

## Minute 1-3: Architecture

Show:

- API Gateway.
- Auth, user, company, job, application, notification, audit, AI services.
- Service-owned databases.
- Kafka/outbox events.
- OpenSearch fallback.

Open:

- [Service catalog](service-catalog.md)
- [Architecture review index](architecture-review-index.md)

## Minute 3-5: Product UI

Show:

- Jobs page.
- Job detail.
- Candidate dashboard.
- Employer dashboard.
- Admin dashboard.
- AI assistant.

Evidence:

- `docs/screenshots/jobs-page.png`
- `docs/screenshots/job-detail.png`
- `docs/screenshots/candidate-dashboard.png`
- `docs/screenshots/employer-dashboard.png`
- `docs/screenshots/admin-dashboard.png`
- `docs/screenshots/assistant-page.png`

## Minute 5-7: Runtime And Observability

Show:

- Runtime acceptance matrix.
- Grafana SLO screenshot.
- Prometheus alert screenshot.
- Domain metrics smoke script.

Run or reference:

```powershell
.\scripts\v1-runtime-evidence.ps1 -GatewayUrl http://localhost:8080
```

Open:

- [Runtime acceptance matrix](runtime-acceptance-matrix.md)
- [SLO docs](slo.md)

## Minute 7-8: Cloud

Show:

- Terraform AWS blueprint.
- Helm chart.
- Argo CD samples.
- External Secrets.
- Cloud policy audit.

Run:

```powershell
.\scripts\v1-cloud-evidence.ps1
```

Open:

- [Cloud readiness review](cloud-readiness-review.md)
- [Cloud apply runbook](cloud-apply-runbook.md)
- [Cloud completion scorecard](cloud-completion-scorecard.md)

## Minute 8-9: Security And CI/CD

Show:

- CI workflow.
- Docker matrix.
- Security workflow.
- CodeQL.
- SBOM and image labels.

Open:

- [Security evidence](security-evidence.md)
- [Repository health](repository-health.md)

## Minute 9-10: Honest Gaps

Close with:

- This is a production-grade portfolio, not a live SaaS claim.
- AWS is apply-ready but not applied without credentials and budget.
- Runtime proof is script-first and Docker-local unless a hosted demo is explicitly created.

Open:

- [Remaining gaps and roadmap](remaining-gaps-and-roadmap.md)
- [v1 production gap register](v1-production-gap-register.md)

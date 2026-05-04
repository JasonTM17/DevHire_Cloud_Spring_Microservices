# Architecture Review Index

This index is a guided path for a senior backend, DevOps, or solution architecture review. It turns the repository into a set of targeted review stations.

## 5-Minute Orientation

Open:

- `README.md`
- `docs/service-catalog.md`
- `docs/evidence-manifest.md`
- `docs/release-evidence/v0.3.0.md`

Look for:

- microservice boundaries,
- runtime evidence,
- CI/security posture,
- reviewer commands.

## 15-Minute Backend Review

Open:

- `common-lib/src/main/java/com/devhire/common/exception`
- `common-lib/src/main/java/com/devhire/common/outbox`
- `auth-service/src/main/java/com/devhire/auth/service/AuthService.java`
- `job-service/src/main/java/com/devhire/job/service/JobService.java`
- `application-service/src/main/java/com/devhire/application/service/ApplicationWorkflowService.java`
- `notification-service/src/main/java/com/devhire/notification/event`

Ask:

- Are transactions placed at service-layer boundaries?
- Does the controller avoid business logic?
- Are entities hidden behind DTOs?
- Is idempotency handled for async consumers?
- Are failure cases tested or smoke-tested?

## 15-Minute DevOps Review

Open:

- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/docker.yml`
- `.github/workflows/security.yml`
- `.github/workflows/terraform.yml`
- `deploy/helm/devhire-cloud`
- `deploy/terraform/aws/TERRAFORM_DOCS.md`
- `infra/prometheus/rules`
- `infra/grafana/dashboards/devhire-slo-overview.json`

Ask:

- Can the stack be started with one command?
- Are secrets externalized?
- Does CI avoid cloud apply by default?
- Are observability and SLO evidence present?
- Can a reviewer run a small runtime proof locally?

## 15-Minute AI/Product Review

Open:

- `ai-service/src/main/java/com/devhire/ai/service/AiAssistantService.java`
- `ai-service/src/main/java/com/devhire/ai/tool`
- `docs/ai-safety.md`
- `docs/ai-evaluation.md`
- `frontend/src/app/assistant/page.tsx`
- `frontend/e2e/assistant-smoke.spec.ts`

Ask:

- Does fallback work without a real provider key?
- Are citations and tool traces visible?
- Are unsafe prompts refused?
- Is provider cost/secret policy documented?

## Runtime Proof Path

Run:

```powershell
docker compose up -d --build
.\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl http://localhost:8080
.\scripts\evidence-audit.ps1
```

Expected proof:

- Gateway readiness passes,
- API smoke completes a real recruitment flow,
- runtime reliability verifies auth/application/notification/audit/AI failure paths,
- AI eval passes in deterministic fallback mode when no Anthropic key is configured,
- Mailpit captures email,
- OpenAPI required paths exist,
- k6 smoke has 0% failed requests for the lightweight local gate,
- evidence manifest passes.

## Residual Risk Review

Known intentionally scoped limits:

- AWS Terraform is blueprint-only; no `terraform apply` is run without account credentials.
- Claude Haiku runs in demo fallback unless a rotated key is supplied through environment/secret store.
- Mailpit is the default local SMTP path; Gmail SMTP remains an optional secret-backed profile.
- Kubernetes and Helm are production-shaped samples; local acceptance relies on Docker Compose.

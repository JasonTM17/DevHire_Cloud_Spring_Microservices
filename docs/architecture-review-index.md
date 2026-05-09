# Architecture Review Index

This index is a guided path for a senior backend, DevOps, or solution architecture review. It turns the repository into a set of targeted review stations.

## 5-Minute Orientation

Open:

- `README.md`
- `docs/status.md`
- `docs/REVIEW_EVIDENCE.md`
- `docs/service-catalog.md`
- `docs/evidence-manifest.md`
- `docs/code-assessment-reviewer-proof.md`

Look for:

- microservice boundaries,
- runtime evidence,
- CI/security posture,
- reviewer commands,
- clear claims and explicit non-claims.

## 15-Minute Backend Review

Open:

- `common-lib/src/main/java/com/devhire/common/exception`
- `common-lib/src/main/java/com/devhire/common/outbox`
- `auth-service/src/main/java/com/devhire/auth/service/AuthService.java`
- `job-service/src/main/java/com/devhire/job/service/JobService.java`
- `application-service/src/main/java/com/devhire/application/service/ApplicationWorkflowService.java`
- `application-service/src/main/java/com/devhire/application/service/CodeAssessmentService.java`
- `assessment-runner-service/src/main/java/com/devhire/assessmentrunner`
- `notification-service/src/main/java/com/devhire/notification/event`

Ask:

- Are transactions placed at service-layer boundaries?
- Does the controller avoid business logic?
- Are entities hidden behind DTOs?
- Is idempotency handled for async consumers?
- Are failure cases tested or smoke-tested?
- Does the code-assessment domain keep hidden tests and score ownership on the server side?

## 15-Minute DevOps Review

Open:

- `docker-compose.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/docker.yml`
- `.github/workflows/release.yml`
- `.github/workflows/security.yml`
- `.github/workflows/terraform.yml`
- `deploy/helm/devhire-cloud`
- `deploy/terraform/aws/TERRAFORM_DOCS.md`
- `infra/prometheus/rules`
- `infra/grafana/dashboards/devhire-slo-overview.json`
- `docs/container-images.md`

Ask:

- Can the stack be started with one command?
- Are secrets externalized?
- Does CI avoid cloud apply by default?
- Are observability and SLO evidence present?
- Can a reviewer run a small runtime proof locally?
- Do image tags, SBOM, provenance, and registry docs trace back to source and CI?

## 15-Minute AI/Product Review

Open:

- `ai-service/src/main/java/com/devhire/ai/service/AiAssistantService.java`
- `ai-service/src/main/java/com/devhire/ai/tool`
- `docs/ai-safety.md`
- `docs/ai-evaluation.md`
- `docs/ui-redesign-v0.6.md`
- `docs/design-system.md`
- `frontend/src/app/assistant/page.tsx`
- `frontend/src/app/candidate/assessments/page.tsx`
- `frontend/e2e/assistant-smoke.spec.ts`
- `frontend/e2e/stitch-route-matrix.spec.ts`

Ask:

- Does fallback work without a real provider key?
- Are citations and tool traces visible?
- Are unsafe prompts refused?
- Is provider cost/secret policy documented?
- Does the UI match the Stitch operations design system and avoid broken/loading/fallback evidence?

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

# Remaining Gaps And Production Roadmap

DevHire Cloud is a production engineering portfolio, not a live SaaS system running customer traffic. The repository demonstrates strong microservice architecture, cloud blueprinting, CI/CD, security, observability, runtime scripts, and reviewer evidence. The items below are the remaining gaps before treating it as a real production platform.

## Current State

| Area | Current state | Remaining gap | Next action |
|---|---|---|---|
| Public GitHub facade | About, topics, releases, branch protection, and Dependabot cleanup are applied | Keep docs aligned with `v0.6.0` and future tags | Run release hygiene checks before every tag |
| Cloud | AWS Terraform, Helm, raw Kubernetes, External Secrets, and Argo CD are blueprint-ready and validated | No real AWS account has been applied | Run the cloud apply runbook in a budget-controlled staging account |
| Runtime | Docker Compose, API smoke, E2E, Mailpit, OpenAPI, metrics, chaos, and migration scripts exist | Full runtime evidence is local and generated on demand | Publish sanitized runtime evidence per release |
| Monitoring | Prometheus rules, Grafana dashboards, domain metrics, SLO docs, and runtime observability smoke exist | No long-running production traffic history | Run a scheduled demo environment and archive SLO snapshots |
| Data | Service-owned seed data includes rich deterministic portfolio records | Dataset is synthetic, not anonymized real business traffic | Add realistic growth scenarios and data dictionary refinements |
| Backend tests | Unit, controller, architecture, contract, Testcontainers, migration, and runtime scripts exist | Coverage is ratcheted but still uneven across modules | Keep raising low modules in small PRs |
| Security | Gitleaks, Trivy, CodeQL, SBOM, dependency policy, secret policy, and image labels exist | No external penetration test or mandatory signature verification gate | Add OWASP ZAP baseline and cosign keyless verification |
| Frontend | Recruiter demo flows, dashboards, assistant page, screenshots, and E2E smoke exist | Some evidence screenshots need stricter visual text gates | Promote only screenshots that pass the stronger denylist |
| AI assistant | Claude Haiku integration, fallback mode, citations, eval scripts, tool traces, and metrics exist | No live provider smoke is required by CI | Add optional manual provider smoke with strict cost controls |
| Operations | Runbooks cover common incidents, backup/restore, degraded dependencies, and cloud apply | No real on-call or cloud restore drill evidence | Run a staged DR drill and attach sanitized evidence |

## v1 Roadmap

The v1 roadmap is a future acceptance path, not a published release claim:

1. `v0.6.0`: shipped product UX, code-assessment, admin/ops, screenshot, and Docker Hub release polish.
2. `v0.7.0`: backend integration maturity and coverage ratchets.
3. `v0.7.5`: API and event compatibility baselines.
4. `v0.8.0`: observability and SLO maturity.
5. `v0.8.5`: richer deterministic data and dashboard realism.
6. `v0.9.0`: cloud apply-ready hardening.
7. `v0.9.5`: security and supply-chain release-candidate evidence.
8. `v1.0.0`: final portfolio release only after all acceptance gates pass on `master`.

## Not Claimed

- Live customer SaaS traffic.
- Real AWS deployment.
- External penetration-test completion.
- Production incident history.
- Real provider SLA proof for Claude or Gmail SMTP.

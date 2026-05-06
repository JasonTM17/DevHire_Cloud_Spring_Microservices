# DevHire Cloud v1 Production Gap Register

This register separates production-grade portfolio evidence from work required for a real hosted production deployment.

## Gap Matrix

| Area | v1 portfolio state | Remaining real-production gap | Evidence path |
|---|---|---|---|
| Source governance | Protected branch, required checks, release evidence | External reviewer approval required for current integration PR | PR #29 and GitHub workflow status |
| Runtime | Docker Compose stack and runtime scripts | No public hosted demo SLA | `v1-runtime-evidence.ps1` |
| Cloud | AWS blueprint validates without credentials | No real AWS apply, DNS, TLS, or ingress proof | `v1-cloud-evidence.ps1` |
| Data | Deterministic synthetic seed data | No anonymized real production data | `v1-demo-data-verify.ps1` |
| Security | Gitleaks, Trivy, CodeQL, SBOM, policy docs | No external pentest or enforced image signature gate yet | `security-evidence.md` |
| Observability | Prometheus, Grafana, alerts, domain metrics | No multi-day traffic/error-budget history | `runtime-observability-smoke.ps1` |
| AI | Claude Haiku config, fallback, citations, eval scripts | No paid provider SLA or live-key CI smoke | `ai-safety.md` |
| DR | Backup/restore scripts and runbooks | No hosted cloud restore drill | `dr-verify.ps1` |

## Priority Order To Close Gaps

1. Merge current protected PR and tag v0.5.1.
2. Publish v1 release verification scripts and evidence docs.
3. Run a full Docker runtime proof and promote sanitized screenshots.
4. Execute an AWS staging apply only after budget, DNS, remote state, and secret ownership are ready.
5. Add keyless image signing enforcement after release image workflow stabilizes.
6. Run a scheduled multi-day demo environment to collect SLO evidence.

## Not A Gap

These are already handled:

- Multi-module Java/Spring architecture.
- Service-owned database migrations.
- API Gateway and security filters.
- Kafka/outbox event reliability posture.
- OpenSearch plus PostgreSQL fallback.
- Next.js product UI and E2E smoke.
- Trilingual documentation.
- Docker, Kubernetes, Helm, GitOps, Terraform, and External Secrets artifacts.
- CI, Docker, Docs, Security, CodeQL, E2E, and Terraform workflows.

## Release Rule

Do not tag v1.0.0 while any of these are true:

- `master` is not green.
- docs parity fails.
- cloud evidence fails.
- release evidence overclaims a live production deployment.
- generated reports or secrets are staged.

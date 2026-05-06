# Cloud Completion Scorecard

This scorecard separates what is already verifiable in the repository from what requires a real AWS account. It prevents the portfolio from overstating cloud deployment while still showing production-grade cloud engineering depth.

## Current State

| Capability | Status | Evidence |
|---|---|---|
| Docker local stack | Complete | `docker compose config --quiet`, `docker compose up --build` |
| Raw Kubernetes manifests | Complete | `kubectl kustomize deploy/k8s`, no `latest`, includes `ai-service` |
| Helm chart | Complete | `helm lint/template` via `.\scripts\cloud-verify.ps1` |
| GitOps samples | Complete | Argo CD samples use `targetRevision: master` |
| External Secrets wiring | Complete | AWS values render `ClusterSecretStore` and `ExternalSecret` |
| Terraform AWS blueprint | Apply-ready blueprint | VPC, EKS, RDS, Redis, MSK, OpenSearch, ECR, Secrets Manager |
| Terraform validation | Complete | `.\scripts\terraform-validate.ps1` |
| Parallel validation safety | Complete | `.\scripts\terraform-race-smoke.ps1` |
| Cloud policy audit | Complete | `.\scripts\cloud-policy-audit.ps1` |
| Real AWS apply | Not run | Requires account, budget, domain, remote state, and secrets |

## Production Guardrails

| Guardrail | Status |
|---|---|
| No mutable `latest` tags in raw/prod deployment paths | Passed |
| ECR tag immutability and scan-on-push | Passed |
| RDS encrypted, private, backup-enabled, deletion-protected | Passed |
| Redis at-rest and transit encryption | Passed |
| MSK IAM authentication | Passed |
| OpenSearch HTTPS and encryption | Passed |
| EKS control-plane logs and IRSA | Passed |
| Prod Terraform expensive resources disabled by default | Passed |
| AWS values require External Secrets | Passed |
| `.invalid` placeholder domain documented and centralized | Passed |

## Reviewer Commands

```powershell
.\scripts\terraform-validate.ps1
.\scripts\terraform-race-smoke.ps1
.\scripts\cloud-policy-audit.ps1
.\scripts\cloud-verify.ps1
.\scripts\cloud-evidence-summary.ps1
.\scripts\portfolio-verify.ps1 -Cloud
```

## Remaining Real-Cloud Work

- Create AWS remote state and locking.
- Replace placeholder domain, certificate ARN, ECR account, and endpoint values.
- Store runtime secrets in AWS Secrets Manager.
- Push images to ECR.
- Run Terraform plan/apply through a reviewed change window.
- Run full runtime smoke and rollback drill in staging.

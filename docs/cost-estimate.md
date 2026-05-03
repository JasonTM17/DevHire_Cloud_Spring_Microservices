# DevHire Cloud Cost Guardrails

This repository includes an AWS Terraform blueprint for portfolio review and production planning. It is deliberately safe by default: CI validates and scans Terraform code, but never runs `terraform apply`.

## Default Safety Posture

- Terraform environments use local backend configuration unless a maintainer explicitly passes `backend.s3.example.hcl`.
- Expensive resources are behind enable toggles and default to `false` in `terraform.tfvars.example`.
- Secrets Manager resources create secret names and ARNs only. Secret values are not generated or committed.
- CI runs `fmt`, `init -backend=false`, `validate`, TFLint, and Trivy config scan only.
- GitHub Actions do not include AWS credentials and do not apply infrastructure.

## Cost-Sensitive Toggles

| Toggle | Default | Cost impact |
| --- | --- | --- |
| `enable_nat_gateway` | `false` | NAT Gateway has hourly and data processing cost. Enable only when private subnets need outbound internet. |
| `enable_eks` | `false` | EKS control plane and managed nodes are billed continuously. |
| `enable_rds` | `false` | RDS PostgreSQL runs persistent compute and storage. |
| `enable_redis` | `false` | ElastiCache nodes are hourly resources. |
| `enable_msk` | `false` | MSK Serverless is cheaper than provisioned MSK for small workloads, but still billable. |
| `enable_opensearch` | `false` | OpenSearch instances and EBS storage can become expensive quickly. |

## Suggested Portfolio Demo Mode

For a recruiter or reviewer, use Docker Compose locally:

```powershell
docker compose up --build
scripts/api-smoke.ps1 -GatewayUrl http://localhost:18080
```

For AWS planning, run validation only:

```powershell
scripts/terraform-validate.ps1
```

Do not run `terraform apply` until an AWS budget alarm, remote state backend, secret policy, and destroy plan have been reviewed.

## Pre-Apply Checklist

- Confirm AWS account and region are correct.
- Configure S3 remote state and DynamoDB locking manually.
- Create an AWS budget and billing alert.
- Decide which toggles are truly needed for the environment.
- Store JWT, SMTP, database, OAuth, and API secrets in AWS Secrets Manager.
- Review the plan for public exposure, deletion protection, and instance sizes.
- Run a destroy rehearsal in a disposable environment before creating staging or production resources.

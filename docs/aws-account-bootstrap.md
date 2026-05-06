# AWS Account Bootstrap Checklist

DevHire Cloud is intentionally **blueprint-safe** in this repository: reviewers can validate Terraform, Helm, Kubernetes, and GitOps without AWS credentials or cost. Use this checklist before turning the blueprint into a real staging or production environment.

## Account And Governance

| Area | Requirement |
|---|---|
| Ownership | Define account owner, platform owner, billing contact, and incident escalation channel. |
| Identity | Enable MFA for all privileged users and prefer IAM Identity Center or federated access. |
| Terraform operator | Create least-privilege plan/apply roles; keep apply manual and auditable. |
| Budget | Configure AWS Budgets and alerts before enabling NAT, EKS, RDS, MSK, or OpenSearch. |
| Tags | Require `Project`, `Environment`, `Owner`, `CostCenter`, `DataClassification`, and `ManagedBy`. |
| Region | Default blueprint region is `ap-southeast-1`; change intentionally in all env files and Helm AWS values. |

## Remote State

1. Create an encrypted S3 bucket for Terraform state.
2. Enable bucket versioning and block public access.
3. Create a DynamoDB table for state locking.
4. Restrict state access to Terraform plan/apply roles.
5. Copy `deploy/terraform/aws/backend.s3.example.hcl` into an uncommitted backend config and replace placeholders.
6. Run `terraform init` with `-backend-config` only after reviewing the backend target.

## Secrets And Domains

| Item | Source Of Truth |
|---|---|
| JWT signing secret | AWS Secrets Manager |
| Database credentials | RDS managed password or AWS Secrets Manager |
| SMTP credentials | AWS Secrets Manager |
| Anthropic API key | AWS Secrets Manager |
| OpenSearch credentials | AWS Secrets Manager |
| Public domain | Owned DNS zone; never deploy `devhire.invalid` |
| TLS certificate | ACM certificate in the ingress/load balancer region |

## Image Publishing

- Build images from CI with OCI labels and SHA/release tags.
- Push to ECR repositories created by the `container` module.
- Keep ECR tag immutability enabled.
- Use Helm values with immutable image tags, never `latest`.

## Pre-Apply Commands

```powershell
.\scripts\terraform-validate.ps1
.\scripts\terraform-race-smoke.ps1
.\scripts\cloud-policy-audit.ps1
.\scripts\cloud-verify.ps1
.\scripts\cloud-evidence-summary.ps1
```

These commands do not run `terraform apply` and do not require AWS credentials.

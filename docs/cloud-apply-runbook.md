# Cloud Apply Runbook

This runbook describes how DevHire Cloud should be applied to AWS when a real account, budget, domain, and secret store are available. It is **not** executed by CI and is not required for portfolio review.

## Safety Rules

- Do not run `terraform apply` from a dirty worktree.
- Do not commit `.env`, backend config with account details, `tfstate`, `tfplan`, kubeconfig, or generated reports.
- Start with `dev`, then `staging`, then `prod`.
- Keep `enable_*` flags disabled until cost, quota, IAM, and rollback are reviewed.
- For prod, use immutable image tags and real secret references before traffic cutover.

## Apply Sequence

## First Real AWS Apply Checklist

Before the first `terraform apply`, the owner should record these decisions in the private deployment ticket or change request:

| Area | Required decision |
|---|---|
| Account | AWS account id, region, IAM administrator, and break-glass owner are confirmed. |
| Budget | Monthly budget alarm, service quota review, and explicit approval for RDS, EKS, MSK, OpenSearch, NAT, and load balancer costs. |
| State | S3 backend bucket and DynamoDB lock table are created, encrypted, versioned, and not committed to Git. |
| Domain | Public domain, ACM certificate, DNS zone, and ingress hostname are owned by the deployer. |
| Secrets | JWT, database, SMTP, Anthropic, OpenSearch, and OAuth/API keys are written to Secrets Manager outside Terraform state. |
| Images | GHCR or ECR image tags are immutable release tags or commit SHAs, never `latest`. |
| Rollback | Previous image tag, RDS snapshot/backup, outbox replay plan, and destroy plan are reviewed before traffic cutover. |
| Evidence | CI, Docker, Security, CodeQL, Terraform, E2E, cloud policy audit, and runtime smoke links are attached. |

1. Confirm repository gates:

```powershell
.\scripts\portfolio-verify.ps1 -Docs -Docker -Cloud
.\scripts\github-workflow-status.ps1 -RequireGreen
```

2. Initialize remote state with an uncommitted backend config:

```powershell
terraform -chdir=deploy/terraform/aws/environments/staging init -backend-config=../../backend.s3.example.hcl
```

3. Generate a plan and review it before apply:

```powershell
terraform -chdir=deploy/terraform/aws/environments/staging plan -out=devhire-staging.tfplan
```

4. Apply only after peer review:

```powershell
terraform -chdir=deploy/terraform/aws/environments/staging apply devhire-staging.tfplan
```

5. Push container images to ECR with SHA tags.
6. Render Helm with AWS values and the Terraform output endpoints.
7. Sync the Argo CD AWS application.
8. Run API smoke, OpenAPI verification, AI eval, email smoke, and runtime reliability scripts.

## Rollback

| Layer | Rollback path |
|---|---|
| Application | Revert Helm image tag or Argo CD sync target. |
| Database | Restore RDS snapshot or logical backup using `docs/runbooks/backup-restore.md`. |
| Search | Enable PostgreSQL search fallback while OpenSearch recovers. |
| Messaging | Keep outbox events pending and resume publisher after Kafka/MSK recovery. |
| Infrastructure | Revert infrastructure Git commit, re-plan, review, then apply. |

## Evidence To Record

- Terraform plan summary, excluding secrets.
- Helm rendered manifest hash or sanitized summary.
- Runtime smoke results.
- Workflow links for CI, Docker, Security, CodeQL, Terraform, and E2E.
- Any remaining manual owner actions.

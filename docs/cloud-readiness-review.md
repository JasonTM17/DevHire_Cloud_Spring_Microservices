# Cloud Readiness Review

DevHire Cloud is cloud-ready as a blueprint and evidence package. It is not pretending to be deployed into AWS from this local environment. The repository gives reviewers everything needed to inspect the architecture, render Kubernetes manifests, validate Terraform, and understand what must happen before a real production apply.

## What Is Deployable Now

- Docker Compose local stack with PostgreSQL, Redis, Kafka, OpenSearch, Mailpit, Prometheus, Grafana, Loki, Tempo, backend services, AI service, and frontend.
- Helm chart with local, staging, prod, AWS staging, and AWS prod values.
- Argo CD sample applications for local-style and AWS-style GitOps review.
- Terraform AWS blueprint with modules for network, EKS, data services, container repositories, and secret placeholders.
- External Secrets wiring that references AWS Secrets Manager placeholders.

## What Requires A Real AWS Account

- Remote state S3 bucket and DynamoDB lock table.
- AWS budget, cost alerts, and account-level service quota review.
- Domain ownership and Route 53 or external DNS delegation.
- ACM certificates for the selected domain.
- Secrets Manager values for JWT, database, SMTP, Anthropic, OAuth, and OpenSearch credentials.
- ECR image push permissions and Kubernetes image pull access.
- IRSA roles for workloads that need AWS API access.

## Placeholder Domain Convention

The repository uses `devhire.example.com` and `staging.devhire.example.com` as documented placeholder hostnames only. They mean:

- replace with a domain you own before any real deployment;
- update Helm values, Kubernetes ingress, CORS, email dashboard URL, frontend API base URL, and GitHub repository homepage together;
- never use the placeholder values in a public production environment.

This convention is intentionally explicit so reviewers can search for `devhire.example.com` and see every place a real domain must be wired.

## Remote State Migration

Default validation uses local backend and `terraform init -backend=false`.

Before a real plan/apply:

1. Create an encrypted S3 bucket for state.
2. Create a DynamoDB table for state locking.
3. Restrict IAM access to the state bucket and lock table.
4. Copy `deploy/terraform/aws/backend.s3.example.hcl` to an uncommitted backend file or pass it via CI secret-backed configuration.
5. Run:

```powershell
terraform -chdir=deploy/terraform/aws/environments/staging init -backend-config=../../backend.s3.example.hcl
```

6. Confirm `.terraform`, `.terraform.lock.hcl`, `terraform.tfstate`, `*.tfplan`, and backend files containing account details remain uncommitted.

## AWS Account Bootstrap Checklist

- Confirm account owner, billing contact, budget threshold, and alert recipients.
- Enable MFA and least-privilege IAM for Terraform operators.
- Create CI role for plan-only workflows and keep apply manual.
- Define environment tags: `Project`, `Environment`, `Owner`, `CostCenter`, `DataClassification`, `ExpiresOn`.
- Confirm service quotas for EKS nodes, NAT gateways, RDS, MSK Serverless, and OpenSearch.
- Create or import domain and certificate.
- Store runtime secrets in AWS Secrets Manager.
- Push signed or provenance-labeled images to ECR.
- Render Helm with AWS values and review ExternalSecret references.

## Rollback Path

- Application rollback: use Helm release history or Argo CD sync to the previous image tag.
- Database rollback: restore from the latest RDS snapshot or logical dump according to `docs/runbooks/backup-restore.md`.
- Search rollback: switch job search to PostgreSQL fallback while OpenSearch recovers.
- Messaging rollback: leave outbox events pending and resume Kafka publishing after recovery.
- Infrastructure rollback: review Terraform plan carefully, then revert the Git commit that changed desired state and re-plan.

## Cost Guardrails

All expensive Terraform resources are controlled by enable flags and are disabled in examples:

- `enable_nat_gateway`
- `enable_eks`
- `enable_rds`
- `enable_redis`
- `enable_msk`
- `enable_opensearch`

See `docs/cost-estimate.md` before enabling any of them.

## Reviewer Commands

```powershell
.\scripts\terraform-validate.ps1 -SkipTflint -SkipTrivy
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-aws-staging.yaml
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-aws-prod.yaml
```

Use the full Terraform validation script without skip flags when Docker has enough time and network access to pull the scanner images.


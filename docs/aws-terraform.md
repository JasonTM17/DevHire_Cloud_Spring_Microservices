# DevHire Cloud AWS Terraform Blueprint

The AWS Terraform blueprint is a production-style reference architecture for DevHire Cloud. It is safe by default: CI validates and scans the code, but never applies infrastructure and never requires cloud credentials.

For the v0.3 professional review path, also read `docs/cloud-readiness-review.md` and `deploy/terraform/aws/TERRAFORM_DOCS.md`.

## Scope

Terraform lives under `deploy/terraform/aws` and is split into reusable modules:

- `modules/network`: VPC, public and private subnets, route tables, NAT gateway toggle, security groups.
- `modules/eks`: EKS cluster, managed node group, OIDC provider, IRSA-ready output.
- `modules/data`: RDS PostgreSQL, ElastiCache Redis, MSK Serverless Kafka, OpenSearch.
- `modules/container`: ECR repositories for backend services and frontend.
- `modules/secrets`: AWS Secrets Manager secret placeholders.
- `environments/dev`, `environments/staging`, `environments/prod`: environment entrypoints.

## Safe Defaults

- Local backend is used by default.
- `backend.s3.example.hcl` documents S3 state and DynamoDB locking, but is not enabled automatically.
- Expensive resources are behind toggles and default to disabled in examples.
- Secrets Manager stores placeholder secret names and ARNs only; secret values must be created outside Git.
- AI provider secrets are represented as placeholders such as `anthropic-api-key`; Terraform never stores the key value.
- CI runs validation and security checks only. There is no `terraform apply` workflow.

## Local Validation

Run the same validation logic as CI:

```powershell
scripts/terraform-validate.ps1
```

The script runs:

- `terraform fmt -check -recursive`
- `terraform init -backend=false`
- `terraform validate`
- `tflint --recursive`
- `trivy config`

For a single environment:

```powershell
docker run --rm -e TF_IN_AUTOMATION=true -v "${PWD}:/workspace" -w /workspace/deploy/terraform/aws/environments/staging hashicorp/terraform:1.10.5 init -backend=false
docker run --rm -e TF_IN_AUTOMATION=true -v "${PWD}:/workspace" -w /workspace/deploy/terraform/aws/environments/staging hashicorp/terraform:1.10.5 validate
```

## Remote State

Remote state should be enabled only after manually creating:

- An encrypted S3 bucket.
- A DynamoDB lock table.
- An IAM policy scoped to the state bucket and lock table.

Example:

```powershell
terraform -chdir=deploy/terraform/aws/environments/staging init -backend-config=../../backend.s3.example.hcl
```

Do not commit generated `.terraform`, `.terraform.lock.hcl`, `terraform.tfstate`, `*.tfplan`, or real backend files with account-specific secrets.

## Outputs Used By Helm

Terraform exposes outputs that are consumed by the AWS Helm overlays:

- EKS cluster name and region.
- ECR repository URLs.
- RDS PostgreSQL endpoint.
- ElastiCache Redis endpoint.
- MSK bootstrap brokers.
- OpenSearch endpoint.
- Secrets Manager ARNs.
- Anthropic API key secret placeholder for `ai-service`.

Render AWS Helm values:

```powershell
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-aws-staging.yaml
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-aws-prod.yaml
```

Argo CD sample:

```text
deploy/gitops/argocd-aws-application.yaml
```

## Cost Guardrails

See `docs/cost-estimate.md` before running any plan or apply against a real AWS account.

High-cost resources are controlled by these toggles:

- `enable_nat_gateway`
- `enable_eks`
- `enable_rds`
- `enable_redis`
- `enable_msk`
- `enable_opensearch`

Before apply:

1. Create an AWS budget and alert.
2. Confirm the target account and region.
3. Review every enabled toggle.
4. Store runtime secrets in AWS Secrets Manager.
5. Use remote state with locking.
6. Review `terraform plan` for public exposure and deletion protection.
7. Prepare a destroy procedure for non-production environments.

## Secret Policy

Never commit:

- AWS credentials.
- SMTP credentials.
- JWT secrets.
- OAuth/API keys.
- Kubernetes kubeconfig.
- Terraform state or generated plans.

Use `.env.example`, AWS Secrets Manager, External Secrets Operator, or another managed secret flow for runtime configuration.

# DevHire Cloud AWS Terraform Blueprint

This directory is a production-style AWS infrastructure blueprint for DevHire Cloud.
It is intentionally safe for portfolio use: CI validates and scans the code, but does not run `terraform apply`.

## Layout

- `modules/network`: VPC, public/private subnets, NAT gateway toggle, service/database security groups.
- `modules/eks`: EKS cluster, managed node group, IAM roles, optional IRSA OIDC provider.
- `modules/data`: RDS PostgreSQL, ElastiCache Redis, MSK Serverless Kafka, OpenSearch.
- `modules/container`: ECR repositories for backend services and frontend.
- `modules/secrets`: AWS Secrets Manager secret placeholders without secret values.
- `environments/dev|staging|prod`: environment entrypoints.

For a table-driven module and output reference, see `deploy/terraform/aws/TERRAFORM_DOCS.md`.

## Safe Validation

```bash
terraform -chdir=deploy/terraform/aws/environments/dev init -backend=false
terraform -chdir=deploy/terraform/aws/environments/dev validate
```

Or run the same Docker-based validation used by CI:

```powershell
scripts/terraform-validate.ps1
```

Remote state is disabled by default. Use `backend.s3.example.hcl` only after creating a real S3 bucket and DynamoDB lock table.

The end-to-end account bootstrap and remote-state migration review lives in `docs/cloud-readiness-review.md`.

## Cost Guardrails

The environment examples keep `enable_nat_gateway`, `enable_eks`, `enable_rds`, `enable_redis`, `enable_msk`, and `enable_opensearch` disabled by default. See `docs/cost-estimate.md` before running `terraform apply`.

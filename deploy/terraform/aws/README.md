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

## Safe Validation

```bash
terraform -chdir=deploy/terraform/aws/environments/dev init -backend=false
terraform -chdir=deploy/terraform/aws/environments/dev validate
```

Remote state is disabled by default. Use `backend.s3.example.hcl` only after creating a real S3 bucket and DynamoDB lock table.

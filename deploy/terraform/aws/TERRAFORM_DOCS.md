# Terraform Module Reference

This document is the checked-in Terraform documentation snapshot for the AWS blueprint. It is intentionally concise and reviewable without a real AWS account.

## Root Environments

| Environment | Path | Default posture | Intended use |
| --- | --- | --- | --- |
| Dev | `environments/dev` | All expensive toggles disabled | Local validation and low-cost sandbox planning. |
| Staging | `environments/staging` | All expensive toggles disabled | Pre-production account wiring after budget and IAM review. |
| Prod | `environments/prod` | All expensive toggles disabled | Production plan review only until real domain, secrets, budget, and state backend exist. |

Each environment exposes the same variables:

| Variable | Type | Default style | Notes |
| --- | --- | --- | --- |
| `aws_region` | string | `ap-southeast-1` | Change per target account and latency needs. |
| `environment` | string | `dev`, `staging`, `prod` | Used in tags and resource names. |
| `name_prefix` | string | `devhire-{environment}` | Keep globally unique where AWS requires it. |
| `vpc_cidr` | string | `10.x.0.0/16` | Must not overlap peered networks or corporate VPN ranges. |
| `availability_zones` | list(string) | three AZs | Choose AZs supported by EKS/RDS/MSK in the target region. |
| `enable_nat_gateway` | bool | `false` | Costly; required for private subnet egress unless using VPC endpoints. |
| `enable_eks` | bool | `false` | Enables EKS control plane and node group. |
| `enable_rds` | bool | `false` | Enables PostgreSQL RDS placeholder. |
| `enable_redis` | bool | `false` | Enables ElastiCache Redis placeholder. |
| `enable_msk` | bool | `false` | Enables MSK Serverless Kafka placeholder. |
| `enable_opensearch` | bool | `false` | Enables OpenSearch placeholder. |
| `extra_tags` | map(string) | `{}` | Add owner, cost center, data classification, and expiration tags. |

## Module Map

| Module | Responsibility | Important outputs |
| --- | --- | --- |
| `modules/network` | VPC, public/private subnets, routing, NAT toggle, EKS/data security groups | `vpc_id`, `public_subnet_ids`, `private_subnet_ids`, `eks_cluster_security_group_id`, `data_security_group_id` |
| `modules/container` | ECR repositories for backend services and frontend | `repository_urls`, `repository_arns` |
| `modules/secrets` | AWS Secrets Manager placeholders without secret values | `secret_arns`, `secret_names` |
| `modules/eks` | EKS control plane, managed node group, OIDC/IRSA-ready output | `cluster_name`, `cluster_endpoint`, `oidc_provider_arn` |
| `modules/data` | RDS PostgreSQL, ElastiCache Redis, MSK Serverless Kafka, OpenSearch toggles | `postgres_endpoint`, `redis_primary_endpoint`, `kafka_bootstrap_brokers_sasl_iam`, `opensearch_endpoint` |

## Outputs Consumed By Helm

| Terraform output | Helm value target | Purpose |
| --- | --- | --- |
| `ecr_repository_urls` | `global.imageRegistry` and service image repositories | Pull production images from ECR. |
| `postgres_endpoint` | external PostgreSQL/RDS config | Service-owned databases use RDS host plus separate DB names. |
| `redis_primary_endpoint` | Redis external endpoint | Gateway rate limiting, token blacklist, and cache. |
| `kafka_bootstrap_brokers_sasl_iam` | Kafka external bootstrap | Event-driven outbox publishing and consumers. |
| `opensearch_endpoint` | OpenSearch external endpoint | Job search adapter. |
| `secret_arns` | External Secrets references | JWT, SMTP, Anthropic, DB, OAuth, and OpenSearch credentials. |

## Validation Commands

```powershell
.\scripts\terraform-validate.ps1
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-aws-staging.yaml
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-aws-prod.yaml
```

No workflow in this repository runs `terraform apply`.


# ADR 0006: AWS Terraform Blueprint

## Status

Accepted.

## Context

DevHire Cloud already has Docker Compose, raw Kubernetes manifests, Helm, Argo CD samples, CI, security scanning, and observability. The remaining infrastructure gap is a realistic cloud blueprint that demonstrates production planning without requiring a real AWS account or credentials during portfolio review.

## Decision

Use Terraform to model an AWS deployment blueprint with:

- VPC and subnet topology.
- EKS and managed node groups.
- ECR repositories.
- RDS PostgreSQL, ElastiCache Redis, MSK Serverless Kafka, and OpenSearch behind enable toggles.
- AWS Secrets Manager secret references.
- Environment entrypoints for `dev`, `staging`, and `prod`.

The blueprint is intentionally safe:

- Local backend by default.
- S3 and DynamoDB remote state documented as an example only.
- No CI `terraform apply`.
- No real secret values in source control.
- Validation, linting, and security scanning run in CI.
- Cost-sensitive resources default to disabled in examples.

## Alternatives Considered

- Keep only raw Kubernetes and Helm manifests. This is simpler, but it does not show cloud infrastructure ownership.
- Use `eksctl`. It is fast for EKS bootstrap, but less expressive for the full platform footprint.
- Use AWS CDK. CDK is powerful, but Terraform is easier for many DevOps reviewers to inspect without a language runtime.
- Use Pulumi. Pulumi is developer-friendly, but Terraform has broader portfolio recognition for infrastructure review.

## Consequences

Positive:

- Reviewers can inspect production-grade cloud topology.
- CI can validate and scan infrastructure without AWS credentials.
- Helm AWS overlays can be wired from Terraform outputs.
- Secret and cost guardrails are explicit.

Tradeoffs:

- The blueprint is not a managed production deployment until a real backend, account, secrets, IAM boundaries, and budgets are configured.
- Some modules use intentionally conservative defaults that must be tuned before production apply.
- More CI surface area exists because Terraform, TFLint, and Trivy must stay current.

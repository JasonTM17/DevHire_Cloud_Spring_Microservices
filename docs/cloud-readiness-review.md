# Cloud Readiness Review

DevHire Cloud is cloud-ready as a blueprint and evidence package. It is not pretending to be deployed into AWS from this local environment. The repository gives reviewers everything needed to inspect the architecture, render Kubernetes manifests, validate Terraform, and understand what must happen before a real production apply.

## What Is Deployable Now

- Docker Compose local stack with PostgreSQL, Redis, Kafka, OpenSearch, Mailpit, Prometheus, Grafana, Loki, Tempo, backend services, AI service, and frontend.
- Raw Kubernetes manifests for all backend services, including `ai-service`, with explicit SHA/release placeholder tags instead of `latest`.
- Helm chart with local, staging, prod, AWS staging, and AWS prod values.
- Argo CD sample applications for local-style and AWS-style GitOps review on the repository `master` branch.
- Terraform AWS blueprint with modules for network, EKS, data services, container repositories, and secret placeholders.
- External Secrets wiring that references AWS Secrets Manager placeholders.

## v0.4.8 Cloud Verification Contract

The reviewer-facing cloud gate is Docker-first so it still works when local Terraform, Helm, or kubeconform binaries are not installed.

```powershell
.\scripts\cloud-verify.ps1
.\scripts\portfolio-verify.ps1 -Cloud
```

The script verifies:

| Check | Expected result |
|---|---|
| Terraform | `fmt`, `init -backend=false`, and `validate` for `dev`, `staging`, and `prod`; no `terraform apply` |
| Helm | `lint` and `template` for local, staging, prod, AWS staging, and AWS prod values |
| Raw Kubernetes | `kubectl kustomize deploy/k8s` renders successfully and includes `ai-service` |
| Image posture | Raw K8s and Helm defaults do not use `latest` |
| GitOps branch | Argo CD baseline uses `targetRevision: master` |
| Credentials | AWS credentials are not required for validation |

## What Requires A Real AWS Account

- Remote state S3 bucket and DynamoDB lock table.
- AWS budget, cost alerts, and account-level service quota review.
- Domain ownership and Route 53 or external DNS delegation.
- ACM certificates for the selected domain.
- Secrets Manager values for JWT, database, SMTP, Anthropic, OAuth, and OpenSearch credentials.
- ECR image push permissions and Kubernetes image pull access.
- IRSA roles for workloads that need AWS API access.

## Placeholder Domain Convention

The Helm chart centralizes public-facing placeholders through:

- `global.publicDomain`
- `global.publicBaseUrl`
- `global.smtpFrom`
- `global.smtpReplyTo`

The default placeholder uses the reserved `.invalid` convention, for example `devhire.invalid` and `staging.devhire.invalid`. They mean:

- replace with a domain you own before any real deployment;
- update Helm values, Kubernetes ingress, CORS, email dashboard URL, frontend API base URL, and GitHub repository homepage together;
- never use the placeholder values in a public production environment.

Raw Kubernetes manifests keep a single replacement block using `replace-with-owned-domain` and `replace-with-smtp-host`. Helm is the preferred deployment path for real environments because those values are centralized and auditable.

Audit command:

```powershell
.\scripts\domain-placeholder-audit.ps1
```

## Production Release Defaults

`deploy/helm/devhire-cloud/values-prod.yaml` is intentionally stricter than local values:

- image tags must be release or commit-SHA based; the prod file uses `sha-REPLACE_WITH_GIT_SHA` as an explicit replacement marker instead of `latest`;
- `imagePullPolicy` is `Always` so a new immutable tag is pulled during rollout;
- `global.requireSecretRefs=true`, so pods that need secret material cannot silently boot without the expected Kubernetes Secret;
- local values keep secret refs optional for `helm template` and reviewer-friendly development;
- default chart values are safe to render and do not create example secrets unless the local values file explicitly asks for them.

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
.\scripts\cloud-verify.ps1
.\scripts\portfolio-verify.ps1 -Cloud
.\scripts\terraform-validate.ps1
docker compose config --quiet
kubectl kustomize deploy\k8s
```

`cloud-verify.ps1` will use local `helm`/`kubectl` when available and containerized tools when they are missing. It writes ignored reports under `reports/cloud-verify/`.

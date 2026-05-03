# External Secrets And GitOps Wiring

DevHire Cloud keeps Kubernetes `Secret` examples for local rendering, but the AWS deployment path uses External Secrets Operator and AWS Secrets Manager placeholders.

## Helm Toggle

External Secrets are off by default:

```yaml
externalSecrets:
  enabled: false
```

AWS staging and production values enable it and render:

- `ClusterSecretStore`
- `ExternalSecret`
- target Kubernetes Secret named `devhire-aws-runtime-secrets`

## Secret References

The rendered `ExternalSecret` maps these runtime keys:

- `JWT_SECRET`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`
- `ANTHROPIC_API_KEY`
- `OPENSEARCH_USERNAME`
- `OPENSEARCH_PASSWORD`

Remote keys are placeholders such as:

```text
/devhire/staging/runtime
/devhire/prod/runtime
```

No secret values are stored in Git.

## GitOps Order

Use `deploy/gitops/argocd-aws-staging-externalsecrets.yaml` when a cluster should install External Secrets Operator through Argo CD before rendering DevHire Cloud workloads.

The sample uses Argo CD sync waves:

- wave `0`: External Secrets Operator and CRDs
- wave `1`: DevHire Cloud Helm chart with `values-aws-staging.yaml`

## AWS Runtime Assumptions

- EKS workloads use IRSA.
- The workload service account has permission to read only the required Secrets Manager paths.
- Terraform creates secret names/ARN placeholders, but does not create or apply secret values.
- Production values should be reviewed before enabling automated sync.

# DevHire Cloud Helm Chart

Render local manifests:

```powershell
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-local.yaml
```

Render staging or production:

```powershell
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-staging.yaml
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-prod.yaml
```

Render AWS overlays wired for Terraform outputs/ECR/RDS/ElastiCache/MSK/OpenSearch placeholders:

```powershell
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-aws-staging.yaml
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-aws-prod.yaml
```

Install example:

```powershell
helm upgrade --install devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-prod.yaml --namespace devhire --create-namespace
```

Production notes:

- Set `global.publicDomain`, `global.publicBaseUrl`, `global.smtpFrom`, and `global.smtpReplyTo` for each real environment. The chart derives CORS, frontend API base URL, notification dashboard URL, and default sender values from those globals unless explicitly overridden.
- `values-prod.yaml` does not create the example secret. Create `devhire-secrets` with a secret manager, SealedSecrets, External Secrets, or your cluster's native secret flow. The secret must include `DEVHIRE_GATEWAY_INTERNAL_TOKEN`; services fail closed for `/internal/**` and identity-bearing requests if it is missing.
- `values-aws-staging.yaml` and `values-aws-prod.yaml` render External Secrets Operator resources that sync `devhire-aws-runtime-secrets` from AWS Secrets Manager placeholders.
- Install External Secrets Operator first, or use the Argo CD sample at `deploy/gitops/argocd-aws-staging-externalsecrets.yaml`.
- The runtime secret should include `ANTHROPIC_API_KEY` when `ai-service` should call Claude instead of deterministic fallback mode.
- AWS overlay endpoint placeholders should be replaced from Terraform outputs: public domain, ECR repository URLs, RDS endpoint, ElastiCache endpoint, MSK bootstrap brokers, OpenSearch endpoint, ACM certificate ARN, and IRSA role ARN.
- Raw Kubernetes manifests under `deploy/k8s` remain as a transparent baseline. Helm is the preferred deployment path for configurable environments.
- Image tags should be pinned to a release tag or commit SHA during real production deployments.

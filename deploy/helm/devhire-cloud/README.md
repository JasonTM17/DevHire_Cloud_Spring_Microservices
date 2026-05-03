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

Install example:

```powershell
helm upgrade --install devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-prod.yaml --namespace devhire --create-namespace
```

Production notes:

- `values-prod.yaml` does not create the example secret. Create `devhire-secrets` with a secret manager, SealedSecrets, External Secrets, or your cluster's native secret flow.
- Raw Kubernetes manifests under `deploy/k8s` remain as a transparent baseline. Helm is the preferred deployment path for configurable environments.
- Image tags should be pinned to a release tag or commit SHA during real production deployments.

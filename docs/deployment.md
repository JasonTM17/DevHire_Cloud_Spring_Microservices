# DevHire Cloud Deployment Runbook

This runbook describes the production-style deployment assets included in the portfolio. It is intentionally cloud-neutral so the same service boundaries can be moved to AWS EKS, GKE, AKS, Render private services, or a self-managed Kubernetes cluster.

## Deployment Assets

- `docker-compose.yml`: full local developer stack with PostgreSQL, Redis, Kafka, observability, and all services.
- `deploy/docker-compose.prod.yml`: production Compose sample that expects external databases, Redis, Kafka, and image tags.
- `deploy/k8s`: Kubernetes baseline with namespace, config, secret template, deployments, services, ingress, and autoscaling examples.
- `deploy/k8s-overlays/local`: smaller local cluster overlay with one replica and `devhire.local` ingress host.
- `deploy/k8s-overlays/prod`: production overlay with higher replicas and TLS ingress sample.
- `deploy/helm/devhire-cloud`: Helm chart for local, staging, and production values.
- `deploy/gitops/argocd-application.yaml`: Argo CD sample for GitOps delivery.
- `.github/workflows/release.yml`: GHCR publishing workflow for version tags plus optional Docker Hub mirroring.
- `frontend`: Next.js standalone Docker image served separately from the API Gateway.

## Kubernetes Prerequisites

- Managed PostgreSQL with one database per service.
- Redis reachable from the cluster.
- Kafka reachable from the cluster.
- OpenTelemetry Collector or compatible OTLP endpoint.
- SMTP provider credentials when email delivery is enabled.
- Anthropic API key when Claude API mode is enabled for `ai-service`.
- Ingress controller such as NGINX Ingress.
- Metrics Server when HPA is enabled.

## Configure Secrets

Copy `deploy/k8s/secret.example.yaml` to a private file outside Git, replace all placeholder values, and apply it manually:

```powershell
kubectl apply -f .\devhire-secrets.prod.yaml
```

The example file is safe to commit because it contains placeholders only. Real secrets must be managed through a cloud secret manager, Sealed Secrets, External Secrets Operator, or a private CI/CD secret store.

## Render And Apply Manifests

Preview generated manifests:

```powershell
kubectl kustomize .\deploy\k8s
kubectl kustomize .\deploy\k8s-overlays\prod
```

Deploy after replacing image tags and secrets:

```powershell
kubectl apply -k .\deploy\k8s
```

Production overlay:

```powershell
kubectl apply -k .\deploy\k8s-overlays\prod
```

Patch an image tag after a release:

```powershell
kubectl -n devhire set image deployment/api-gateway api-gateway=ghcr.io/jasontm17/devhire/api-gateway:v1.0.0
```

Container image inventory and Docker Hub mirror names are documented in [container-images.md](container-images.md).

## Helm And GitOps

The Helm chart lives in `deploy/helm/devhire-cloud` and is the preferred path for environment-specific deployments.

Render manifests:

```powershell
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-local.yaml
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-staging.yaml
helm template devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-prod.yaml
```

Install or upgrade:

```powershell
helm upgrade --install devhire-cloud .\deploy\helm\devhire-cloud -f .\deploy\helm\devhire-cloud\values-prod.yaml --namespace devhire --create-namespace
```

Argo CD sample:

```powershell
kubectl apply -f .\deploy\gitops\argocd-application.yaml
```

For production, create `devhire-secrets` outside the chart through External Secrets, SealedSecrets, your cloud secret manager, or a manual Kubernetes Secret before syncing the chart.

## Release Flow

Create and push a semantic version tag:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

The release workflow builds all service images and publishes them to GHCR with both the version tag and commit SHA tag. When `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` repository secrets are present, the same workflow also mirrors images to Docker Hub as `devhire-cloud-<service>` repositories under `DOCKERHUB_NAMESPACE` or the Docker Hub username.

## Post-Deploy Checks

```powershell
kubectl -n devhire get deploy,svc,hpa,ingress
kubectl -n devhire rollout status deployment/api-gateway
kubectl -n devhire logs deployment/api-gateway --tail=100
```

Health endpoints:

- Gateway: `/actuator/health/readiness`
- Services: `/actuator/health/readiness`
- Frontend readiness: `/jobs`
- Prometheus metrics: `/actuator/prometheus`

## Email Delivery

`notification-service` supports SMTP email delivery through Spring Mail. In production, keep SMTP credentials in the secret manager and expose only non-sensitive mail settings through ConfigMaps or environment variables.

Required production variables:

- `DEVHIRE_NOTIFICATION_EMAIL_ENABLED=true`
- `DEVHIRE_NOTIFICATION_EMAIL_FROM`
- `DEVHIRE_NOTIFICATION_EMAIL_DASHBOARD_BASE_URL`
- `DEVHIRE_NOTIFICATION_EMAIL_BATCH_SIZE=25`
- `DEVHIRE_NOTIFICATION_EMAIL_MAX_ATTEMPTS=5`
- `DEVHIRE_NOTIFICATION_EMAIL_RETRY_INITIAL_DELAY_SECONDS=30`
- `DEVHIRE_NOTIFICATION_EMAIL_RETRY_MAX_DELAY_SECONDS=900`
- `DEVHIRE_NOTIFICATION_EMAIL_RATE_LIMIT_PER_MINUTE=60`
- `SPRING_MAIL_HOST`
- `SPRING_MAIL_PORT`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`
- `SPRING_MAIL_SMTP_AUTH=true`
- `SPRING_MAIL_SMTP_STARTTLS_ENABLE=true`
- `SPRING_MAIL_SMTP_STARTTLS_REQUIRED=true`
- `SPRING_MAIL_SMTP_SSL_TRUST=smtp.gmail.com` for Gmail
- `SPRING_MAIL_SMTP_CONNECTION_TIMEOUT=5000`
- `SPRING_MAIL_SMTP_TIMEOUT=5000`
- `SPRING_MAIL_SMTP_WRITE_TIMEOUT=5000`

For Gmail-specific local setup and smoke testing, see `docs/gmail-smtp.md`.

## AI Provider Runtime

`ai-service` can run in deterministic fallback mode for demos or Claude API mode when `ANTHROPIC_API_KEY` is supplied by a secret manager.

Important variables:

- `ANTHROPIC_API_KEY` from Kubernetes Secret or cloud secret manager.
- `ANTHROPIC_BASE_URL=https://api.anthropic.com`
- `ANTHROPIC_MODEL=claude-haiku-4-5-20251001`
- `ANTHROPIC_MAX_TOKENS=900`
- `DEVHIRE_AI_DEMO_FALLBACK_ENABLED=true`
- `DEVHIRE_AI_PROVIDER_FAILURE_THRESHOLD=3`
- `DEVHIRE_AI_PROVIDER_CIRCUIT_OPEN_SECONDS=120`

Admins can validate runtime state through `/api/admin/ai/provider/status` or the Admin dashboard AI provider operations panel.

## Rollback

```powershell
kubectl -n devhire rollout undo deployment/api-gateway
kubectl -n devhire rollout status deployment/api-gateway
```

Rollback service by service so that database migrations, event consumers, and API compatibility can be checked deliberately.

# DevHire Cloud Deployment Runbook

This runbook describes the production-style deployment assets included in the portfolio. It is intentionally cloud-neutral so the same service boundaries can be moved to AWS EKS, GKE, AKS, Render private services, or a self-managed Kubernetes cluster.

## Deployment Assets

- `docker-compose.yml`: full local developer stack with PostgreSQL, Redis, Kafka, observability, and all services.
- `deploy/docker-compose.prod.yml`: production Compose sample that expects external databases, Redis, Kafka, and image tags.
- `deploy/k8s`: Kubernetes baseline with namespace, config, secret template, deployments, services, ingress, and autoscaling examples.
- `.github/workflows/release.yml`: GHCR publishing workflow for version tags.

## Kubernetes Prerequisites

- Managed PostgreSQL with one database per service.
- Redis reachable from the cluster.
- Kafka reachable from the cluster.
- OpenTelemetry Collector or compatible OTLP endpoint.
- SMTP provider credentials when email delivery is enabled.
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
```

Deploy after replacing image tags and secrets:

```powershell
kubectl apply -k .\deploy\k8s
```

Patch an image tag after a release:

```powershell
kubectl -n devhire set image deployment/api-gateway api-gateway=ghcr.io/jasontm17/devhire/api-gateway:v1.0.0
```

## Release Flow

Create and push a semantic version tag:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

The release workflow builds all service images and publishes them to GHCR with both the version tag and commit SHA tag.

## Post-Deploy Checks

```powershell
kubectl -n devhire get deploy,svc,hpa,ingress
kubectl -n devhire rollout status deployment/api-gateway
kubectl -n devhire logs deployment/api-gateway --tail=100
```

Health endpoints:

- Gateway: `/actuator/health/readiness`
- Services: `/actuator/health/readiness`
- Prometheus metrics: `/actuator/prometheus`

## Email Delivery

`notification-service` supports SMTP email delivery through Spring Mail. In production, keep SMTP credentials in the secret manager and expose only non-sensitive mail settings through ConfigMaps or environment variables.

Required production variables:

- `DEVHIRE_NOTIFICATION_EMAIL_ENABLED=true`
- `DEVHIRE_NOTIFICATION_EMAIL_FROM`
- `DEVHIRE_NOTIFICATION_EMAIL_DASHBOARD_BASE_URL`
- `SPRING_MAIL_HOST`
- `SPRING_MAIL_PORT`
- `SPRING_MAIL_USERNAME`
- `SPRING_MAIL_PASSWORD`
- `SPRING_MAIL_SMTP_AUTH=true`
- `SPRING_MAIL_SMTP_STARTTLS_ENABLE=true`

## Rollback

```powershell
kubectl -n devhire rollout undo deployment/api-gateway
kubectl -n devhire rollout status deployment/api-gateway
```

Rollback service by service so that database migrations, event consumers, and API compatibility can be checked deliberately.

# Container Images

DevHire Cloud publishes immutable service images from the protected release workflow. GHCR is the canonical registry because it links packages back to this repository through OCI labels. Docker Hub is supported as a public mirror when repository secrets are configured.

## Image Matrix

| Service | GHCR image | Docker Hub mirror |
|---|---|---|
| api-gateway | `ghcr.io/jasontm17/devhire/api-gateway:<tag>` | `docker.io/<namespace>/devhire-cloud-api-gateway:<tag>` |
| auth-service | `ghcr.io/jasontm17/devhire/auth-service:<tag>` | `docker.io/<namespace>/devhire-cloud-auth-service:<tag>` |
| user-service | `ghcr.io/jasontm17/devhire/user-service:<tag>` | `docker.io/<namespace>/devhire-cloud-user-service:<tag>` |
| company-service | `ghcr.io/jasontm17/devhire/company-service:<tag>` | `docker.io/<namespace>/devhire-cloud-company-service:<tag>` |
| job-service | `ghcr.io/jasontm17/devhire/job-service:<tag>` | `docker.io/<namespace>/devhire-cloud-job-service:<tag>` |
| application-service | `ghcr.io/jasontm17/devhire/application-service:<tag>` | `docker.io/<namespace>/devhire-cloud-application-service:<tag>` |
| notification-service | `ghcr.io/jasontm17/devhire/notification-service:<tag>` | `docker.io/<namespace>/devhire-cloud-notification-service:<tag>` |
| audit-service | `ghcr.io/jasontm17/devhire/audit-service:<tag>` | `docker.io/<namespace>/devhire-cloud-audit-service:<tag>` |
| ai-service | `ghcr.io/jasontm17/devhire/ai-service:<tag>` | `docker.io/<namespace>/devhire-cloud-ai-service:<tag>` |
| assessment-runner-service | `ghcr.io/jasontm17/devhire/assessment-runner-service:<tag>` | `docker.io/<namespace>/devhire-cloud-assessment-runner-service:<tag>` |
| frontend | `ghcr.io/jasontm17/devhire/frontend:<tag>` | `docker.io/<namespace>/devhire-cloud-frontend:<tag>` |

Use release tags or commit SHAs. Do not deploy `latest`; it is intentionally not published.

## Registry Metadata

Each image carries OCI labels for:

- source repository;
- exact Git revision;
- release/manual image tag;
- creation timestamp;
- documentation URL;
- title, description, vendor, author, and license.

The release workflow also requests BuildKit provenance and SBOM output for every published image. This makes GHCR package pages readable and lets reviewers trace each image back to source and CI evidence.

## Publish Flow

Release tags publish GHCR images automatically:

```powershell
git tag v0.6.0
git push origin v0.6.0
```

Manual publish uses the same workflow without creating a GitHub Release:

```powershell
gh workflow run release.yml --ref master -f image_tag=v0.6.0-preview
```

Docker Hub mirroring is skipped unless these repository secrets exist:

```powershell
gh secret set DOCKERHUB_USERNAME --repo JasonTM17/DevHire_Cloud_Spring_Microservices
gh secret set DOCKERHUB_TOKEN --repo JasonTM17/DevHire_Cloud_Spring_Microservices
gh variable set DOCKERHUB_NAMESPACE --body <namespace> --repo JasonTM17/DevHire_Cloud_Spring_Microservices
```

If `DOCKERHUB_NAMESPACE` is omitted, the workflow uses `DOCKERHUB_USERNAME` as the namespace.

## Pull Examples

```powershell
docker pull ghcr.io/jasontm17/devhire/api-gateway:v0.6.0
docker pull ghcr.io/jasontm17/devhire/frontend:v0.6.0
```

Docker Hub mirror examples:

```powershell
docker pull docker.io/<namespace>/devhire-cloud-api-gateway:v0.6.0
docker pull docker.io/<namespace>/devhire-cloud-frontend:v0.6.0
```

After the first GHCR publish, package visibility may still need an owner review in GitHub Packages settings if the account defaults packages to private.

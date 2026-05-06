# Frontend Preview Deployment

DevHire Cloud is a Java Spring Boot microservices portfolio. The canonical backend runtime remains Docker Compose locally and the AWS Terraform/Helm/GitOps blueprint for cloud review. Vercel is useful only as an optional reviewer preview for the Next.js frontend.

## Vercel Import Settings

| Setting | Value |
|---|---|
| Project root | `frontend/` |
| Framework | Next.js |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `.next` |
| Required env | `NEXT_PUBLIC_API_BASE_URL` |

Set `NEXT_PUBLIC_API_BASE_URL` to a reachable DevHire API Gateway URL. For local portfolio review, prefer Docker Compose and run the frontend locally instead of deploying a public preview.

## What This Does Not Deploy

- It does not deploy the Java backend services.
- It does not replace Spring Cloud Gateway.
- It does not create a Node.js microservice or serverless backend.
- It does not store secrets in Vercel unless you explicitly configure a real gateway target.

## Reviewer Flow

```powershell
cd frontend
npm ci
npm run typecheck
npm run build
npm run e2e:all
```

When a public preview is needed, import `frontend/` into Vercel and configure `NEXT_PUBLIC_API_BASE_URL` with the Gateway URL from the Docker/AWS environment being reviewed.

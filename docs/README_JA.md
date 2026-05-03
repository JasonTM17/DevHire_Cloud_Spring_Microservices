# DevHire Cloud

DevHire Cloud は、Java Spring Boot による採用プラットフォームの production-style microservices ポートフォリオです。認証、企業審査、求人公開、応募管理、通知、監査ログ、検索、監視、CI/CD、Docker、Kubernetes、Terraform、Next.js UI を含みます。

## Portfolio Screenshots

スクリーンショットは、Playwright と Docker runtime で実際の frontend/API Gateway から取得しています。

| Jobs | Job Detail |
|---|---|
| ![Jobs page](screenshots/frontend-redesign-jobs.png) | ![Job detail](screenshots/frontend-redesign-job-detail.png) |

実際の API Gateway を通した Docker runtime:

![Docker runtime jobs](screenshots/docker-runtime-jobs.png)

| Candidate | Employer | Admin |
|---|---|---|
| ![Candidate dashboard](screenshots/candidate-dashboard.png) | ![Employer dashboard](screenshots/employer-dashboard.png) | ![Admin dashboard](screenshots/admin-dashboard.png) |

## Architecture Snapshot

- `api-gateway` が JWT 検証、routing、CORS、Redis rate limit を担当します。
- 各 service は独自の PostgreSQL database と Flyway migration を持ちます。
- Kafka domain events は transactional outbox から publish されます。
- Notification と Audit の consumer は idempotent です。
- 求人検索は OpenSearch を使い、PostgreSQL fallback もあります。
- Actuator、Prometheus、Grafana、OpenTelemetry、Tempo、Loki で監視します。

## Services

| Service | Port | Responsibility |
|---|---:|---|
| api-gateway | 8080 | Public ingress, JWT validation, CORS, rate limiting |
| auth-service | 8081 | Register, login, refresh rotation, logout |
| user-service | 8082 | Candidate / Employer profiles |
| company-service | 8083 | Company onboarding and admin review |
| job-service | 8084 | Job workflow and OpenSearch search |
| application-service | 8085 | Applications, status changes, history |
| notification-service | 8086 | Internal notifications and optional SMTP delivery |
| audit-service | 8087 | Audit ingestion and admin search |
| frontend | 3001 | Next.js role dashboards and job browsing |

## Run

```bash
docker compose up --build
```

- Frontend: `http://localhost:3001`
- Gateway: `http://localhost:8080`
- Grafana: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- OpenSearch: `http://localhost:9200`

## Verify

```bash
mvn -T1 clean verify
```

```powershell
cd frontend
npm ci
npm run typecheck
npm run build
```

```powershell
./scripts/api-smoke.ps1 -GatewayUrl http://localhost:8080
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@devhire.local` | `Admin@123456` |
| EMPLOYER | `employer@devhire.local` | `Employer@123456` |
| CANDIDATE | `candidate@devhire.local` | `Candidate@123456` |

## Production Highlights

- Java 21, Spring Boot 3.5.13, Spring Cloud 2025.0.2.
- Service-owned databases, Flyway, constraints, indexes, optimistic locking.
- Gateway JWT validation, refresh token rotation, Redis blacklist, CORS, rate limiting.
- Kafka, transactional outbox, idempotent consumers, audit events.
- OpenSearch search adapter with PostgreSQL fallback.
- SMTP notification delivery queue with retry/backoff and persisted status.
- Trace ID を含む標準エラーレスポンス。
- Docker Compose full stack, Helm, Argo CD, Kubernetes, AWS Terraform blueprint.
- GitHub Actions CI/CD, Trivy, Gitleaks, SBOM, Dependabot, k6 smoke, Playwright E2E.

## Key Docs

- [Architecture](architecture.md)
- [Portfolio case study](portfolio-case-study.md)
- [Production readiness](production-readiness.md)
- [Security and supply chain](security.md)
- [Deployment runbook](deployment.md)
- [SLO operations](slo.md)
- [AWS Terraform blueprint](aws-terraform.md)
- [10-minute demo script](demo-script.md)
- [GitHub profile checklist](github-profile.md)

## Near-Term Roadmap

- Claude Haiku ベースの `ai-service`、RAG、citations、streaming UI、metrics、audit events を追加します。
- Demo data reset automation を追加します。
- `v0.1.0` portfolio release を準備します。

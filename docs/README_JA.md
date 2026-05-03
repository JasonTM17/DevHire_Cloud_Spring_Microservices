# DevHire Cloud

DevHire Cloud は、Java Spring Boot による採用プラットフォームのマイクロサービス構成プロジェクトです。ポートフォリオ用途を想定し、認証、求人投稿、応募管理、通知、監査ログ、検索、監視、Docker、CI/CD、テストを含みます。
Candidate、Employer、Admin の主要ワークフローを確認できる Next.js frontend も含みます。

## Portfolio Screenshots

Screenshots are generated from the real frontend through Playwright E2E.

| Jobs | Job Detail |
|---|---|
| ![Jobs page](screenshots/jobs-page.png) | ![Job detail](screenshots/job-detail.png) |

| Candidate | Employer | Admin |
|---|---|---|
| ![Candidate dashboard](screenshots/candidate-dashboard.png) | ![Employer dashboard](screenshots/employer-dashboard.png) | ![Admin dashboard](screenshots/admin-dashboard.png) |

Important docs:

- [Architecture](architecture.md)
- [Security and supply chain](security.md)
- [Deployment runbook](deployment.md)
- [Gmail SMTP runbook](gmail-smtp.md)
- [Production checklist](production-checklist.md)
- [10-minute demo script](demo-script.md)
- [Architecture Decision Records](ADR/0001-microservices-and-service-databases.md)

## 技術スタック

- Java 21, Maven multi-module
- Spring Boot 3.5.13, Spring Cloud 2025.0.2
- Spring Cloud Gateway, Spring Security, JWT, BCrypt
- PostgreSQL, Flyway, JPA/Hibernate
- OpenSearch job search with PostgreSQL fallback
- Transactional outbox and idempotent Kafka consumers
- Redis, Kafka, OpenFeign
- Actuator, Micrometer, Prometheus, Grafana, OpenTelemetry, Tempo, Loki
- JUnit 5, Mockito, MockMvc, Testcontainers PostgreSQL, JaCoCo
- Docker Compose, GitHub Actions, Kubernetes sample manifests
- Helm and Argo CD GitOps sample
- Trivy, Gitleaks and SBOM generation
- Next.js 16, React 19, TypeScript frontend

## サービス

| Service | Port | 役割 |
|---|---:|---|
| api-gateway | 8080 | 外部入口、JWT 検証、ルーティング、CORS、Redis rate limit |
| auth-service | 8081 | 登録、ログイン、refresh token rotation、ログアウト |
| user-service | 8082 | Candidate/Employer プロフィール |
| company-service | 8083 | 会社登録、Admin 承認 |
| job-service | 8084 | 求人ワークフロー、OpenSearch 検索 |
| application-service | 8085 | 応募、ステータス履歴 |
| notification-service | 8086 | イベント駆動の内部通知、任意の SMTP email delivery |
| audit-service | 8087 | 監査ログ保存、Admin 検索 |
| frontend | 3001 | 求人と role dashboard の Next.js UI |

## 起動

```bash
docker compose up --build
```

Gateway: `http://localhost:8080`
Frontend: `http://localhost:3001`

## テスト

```bash
mvn clean verify
```

Unit test、controller test、event contract test、Testcontainers PostgreSQL integration test を実行します。

CI では Maven verify の後に `scripts/check-coverage.ps1` を実行し、module ごとの coverage gate を強制します。
Frontend は `npm ci`、`npm run typecheck`、`npm run build` で検証します。

## Gateway API Smoke

Gateway API smoke verification:

```powershell
./scripts/api-smoke.ps1 -GatewayUrl http://localhost:8080
```

To build and start the full Docker stack on high local ports:

```powershell
./scripts/api-smoke.ps1 -StartStack -Build
```

The script validates login, company approval, job approval, job search, application submission, application status change, notification lookup and audit lookup through the API Gateway.

Gateway performance smoke with k6:

```powershell
./scripts/perf-smoke.ps1 -BaseUrl http://localhost:8080 -Vus 5 -Duration 30s -UseDocker
```

The k6 script checks job search and job detail latency/error thresholds and writes a local JSON summary to `reports/k6/job-search-summary.json`.

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@devhire.local` | `Admin@123456` |
| EMPLOYER | `employer@devhire.local` | `Employer@123456` |
| CANDIDATE | `candidate@devhire.local` | `Candidate@123456` |

## 主要 API

- `POST /api/auth/login`
- `GET /api/users/me`
- `POST /api/companies`
- `PATCH /api/admin/companies/{id}/approve`
- `POST /api/jobs`
- `GET /api/jobs`
- `PATCH /api/admin/jobs/{id}/approve`
- `POST /api/jobs/{jobId}/applications`
- `PATCH /api/applications/{id}/status`
- `GET /api/notifications`
- `GET /api/admin/audit-logs`

API フローは [api.http](api.http) を参照してください。

## 監視

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3000` with `admin/admin`
- OpenSearch: `http://localhost:9200`
- Tempo: `http://localhost:3200`
- Metrics: `/actuator/prometheus`
- Health: `/actuator/health`

## Production-Ready ポイント

- サービスごとの DB と Flyway migration。
- 公開求人検索用 OpenSearch adapter と PostgreSQL fallback。
- 実際の index と constraint。
- JWT、refresh token rotation、BCrypt。
- Gateway での JWT 検証、rate limit、CORS。
- Kafka domain events。
- SMTP email delivery provider と delivery status の永続化。
- Gmail SMTP setup and smoke-test scripts: [gmail-smtp.md](gmail-smtp.md).
- Trace id を含む標準エラーレスポンス。
- Docker Compose full local stack。
- GitHub Actions CI/CD と GHCR release workflow。
- Testcontainers と event contract tests。
- CI の JaCoCo coverage gate。
- API Gateway に接続する Next.js frontend。

## デプロイ

- `deploy/docker-compose.prod.yml`: 本番向け Compose サンプル。
- `deploy/k8s`: Namespace、ConfigMap、Secret template、Deployment、Service、Ingress、HPA の Kubernetes baseline。
- `docs/deployment.md`: release、deploy、health check、rollback の runbook。
- `docs/gmail-smtp.md`: Gmail SMTP setup and smoke-test runbook.

Kubernetes manifest の preview:

```bash
kubectl kustomize ./deploy/k8s
```

## Additional Portfolio Notes

- Transactional outbox and idempotent notification/audit consumers are documented in [ADR/0002-transactional-outbox.md](ADR/0002-transactional-outbox.md).
- Email delivery uses a queue with retry/backoff, rate limiting and persisted status.
- Security workflows include Trivy, Gitleaks and SBOM generation. See [security.md](security.md).
- Helm chart: `deploy/helm/devhire-cloud`.
- Argo CD sample: `deploy/gitops/argocd-application.yaml`.
- Demo script: [demo-script.md](demo-script.md).
- Production checklist: [production-checklist.md](production-checklist.md).

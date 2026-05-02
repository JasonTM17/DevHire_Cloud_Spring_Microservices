# DevHire Cloud

DevHire Cloud は、Java Spring Boot による採用プラットフォームのマイクロサービス構成プロジェクトです。ポートフォリオ用途を想定し、認証、求人投稿、応募管理、通知、監査ログ、検索、監視、Docker、CI/CD、テストを含みます。

## 技術スタック

- Java 21, Maven multi-module
- Spring Boot 3.5.13, Spring Cloud 2025.0.2
- Spring Cloud Gateway, Spring Security, JWT, BCrypt
- PostgreSQL, Flyway, JPA/Hibernate
- OpenSearch job search with PostgreSQL fallback
- Redis, Kafka, OpenFeign
- Actuator, Micrometer, Prometheus, Grafana, OpenTelemetry, Tempo, Loki
- JUnit 5, Mockito, MockMvc, Testcontainers PostgreSQL, JaCoCo
- Docker Compose, GitHub Actions, Kubernetes sample manifests

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

## 起動

```bash
docker compose up --build
```

Gateway: `http://localhost:8080`

## テスト

```bash
mvn clean verify
```

Unit test、controller test、event contract test、Testcontainers PostgreSQL integration test を実行します。

## デモアカウント

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
- Trace id を含む標準エラーレスポンス。
- Docker Compose full local stack。
- GitHub Actions CI/CD と GHCR release workflow。
- Testcontainers と event contract tests。

## デプロイ

- `deploy/docker-compose.prod.yml`: 本番向け Compose サンプル。
- `deploy/k8s`: Namespace、ConfigMap、Secret template、Deployment、Service、Ingress、HPA の Kubernetes baseline。
- `docs/deployment.md`: release、deploy、health check、rollback の runbook。

Kubernetes manifest の preview:

```bash
kubectl kustomize ./deploy/k8s
```

# DevHire Cloud Security And Supply Chain

## Tiếng Việt

### Threat model

DevHire Cloud xử lý dữ liệu tuyển dụng: tài khoản, role, hồ sơ ứng viên, công ty, job, application, notification và audit log. Rủi ro chính gồm đánh cắp token, lộ SMTP/app password, truy cập chéo tenant, publish event trùng, dependency/image có CVE, và cấu hình production dùng secret yếu.

### Chính sách secret

- Không commit `.env`, Gmail app password, JWT secret, database password, SMTP password hoặc kube secret thật.
- `.env.example`, `.env.gmail.example`, `secret.example.yaml` chỉ chứa placeholder.
- Local Gmail app password phải nằm trong `.env` gitignored hoặc biến môi trường tạm thời.
- Production phải dùng GitHub Actions secrets, Docker secrets, Kubernetes Secret hoặc secret manager.
- CI chạy Gitleaks để chặn secret bị commit.

### Token policy

- Access token JWT ngắn hạn, refresh token dài hơn và có rotation.
- Logout/revoke đưa access token vào Redis blacklist.
- Gateway validate JWT và truyền identity qua internal headers.
- Endpoint service vẫn kiểm tra role/ownership ở layer service/controller.

### Supply chain gates

- Dependency Review chặn dependency thay đổi có severity cao trên pull request.
- Trivy filesystem scan chạy trên push/pull request và fail khi có critical vulnerability đã fix được.
- Trivy image scan chạy theo schedule/manual để tránh làm PR quá nặng.
- Syft/Anchore tạo CycloneDX SBOM artifact.
- Docker images có OCI labels: source, revision, title, license.

## English

### Threat model

DevHire Cloud handles recruitment data: accounts, roles, candidate profiles, companies, jobs, applications, notifications, and audit logs. Main risks are token theft, leaked SMTP/app passwords, cross-tenant access, duplicate event handling, vulnerable dependencies/images, and weak production configuration.

### Secret policy

- Never commit real `.env`, Gmail app passwords, JWT secrets, database passwords, SMTP passwords, or Kubernetes Secrets.
- Example files contain placeholders only.
- Local Gmail credentials live in gitignored `.env` or temporary environment variables.
- Production uses GitHub Actions secrets, Docker secrets, Kubernetes Secrets, or a secret manager.
- CI runs Gitleaks to block committed secrets.

### Token policy

- Short-lived JWT access tokens and rotating refresh tokens.
- Logout/revoke stores access tokens in Redis blacklist.
- Gateway validates JWT and forwards identity through internal headers.
- Services still enforce role and ownership rules.

### Supply chain gates

- Dependency Review protects pull requests.
- Trivy filesystem scan runs on push and pull request.
- Trivy image scan runs manually or on schedule.
- Syft/Anchore generates CycloneDX SBOM artifacts.
- Docker images include OCI source and revision labels.

## 日本語

### 脅威モデル

DevHire Cloud はアカウント、ロール、候補者プロフィール、企業、求人、応募、通知、監査ログを扱います。主なリスクは、トークン窃取、SMTP/app password の漏えい、テナント越境アクセス、イベント重複処理、脆弱な依存関係やイメージ、本番設定の不備です。

### シークレット方針

- 実際の `.env`、Gmail app password、JWT secret、DB password、SMTP password、Kubernetes Secret はコミットしません。
- example ファイルには placeholder のみを置きます。
- ローカル Gmail 認証情報は gitignored `.env` または一時的な環境変数で扱います。
- 本番では GitHub Actions secrets、Docker secrets、Kubernetes Secrets、または secret manager を使います。
- CI で Gitleaks を実行し、誤コミットを防ぎます。

### トークン方針

- Access token は短命 JWT、refresh token は rotation します。
- Logout/revoke 時は Redis blacklist を使います。
- Gateway が JWT を検証し、内部 header で identity を渡します。
- 各 service でも role と ownership を検証します。

### サプライチェーン

- Dependency Review で pull request の依存関係変更を検査します。
- Trivy filesystem scan を push/pull request で実行します。
- Trivy image scan は schedule/manual で実行します。
- Syft/Anchore で CycloneDX SBOM artifact を生成します。
- Docker image に OCI label を付与します。

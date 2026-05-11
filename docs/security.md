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

### Code assessment runtime security

- `application-service` owns scoring, hidden tests, deadline checks, final decision locks, and audit evidence.
- `assessment-runner-service` is internal only and accepts `/internal/assessment-runs` only with `X-Internal-Gateway-Token`.
- The production MVP contract is Java `CandidateSolution.solve(String input)` with no package, no public class, and no JUnit dependency.
- Candidate APIs return visible test bodies only; hidden payloads, hidden results, hidden stdout/stderr, and hidden compile output are redacted.
- Employer/admin APIs can see aggregate hidden pass/total metadata and persisted runtime evidence, but not candidate-facing hidden payloads.
- Compile errors, unavailable runners, policy-blocked code, mismatched responses, and malformed runner responses are persisted as failed evidence and never create a trusted final score.
- Production scoring requires `DEVHIRE_RUNNER_MODE=judge0` with an internal Judge0 runtime and fails closed when `JUDGE0_BASE_URL` is missing; local deterministic mode is preview-only.
- Java candidate code is policy-scanned before sandbox execution. The MVP contract blocks `package`, `public class CandidateSolution`, process/network/filesystem calls, and reflection-style boundary escapes.
- Admin challenge publishing requires at least one visible case, one hidden case, and a reference solution that passes the runner before the challenge can become active.
- `scripts/code-assessment-smoke.ps1` verifies the Gateway assign/run/submit/review path and asserts candidate payloads do not expose hidden fixtures; `scripts/judge0-smoke.ps1` verifies live runner health plus accepted, wrong-answer, compile-error, timeout, and policy-blocked Java cases.
- Operational response for runner outages, redaction checks, and fail-closed recovery is documented in [code assessment runner runbook](runbooks/code-assessment-runner.md).

### Supply chain gates

- Dependency Review protects pull requests.
- Trivy filesystem scan runs on push and pull request.
- Trivy image scan runs manually or on schedule.
- Syft/Anchore generates CycloneDX SBOM artifacts.
- Docker images include OCI source and revision labels.
- Dependabot opens scheduled maintenance pull requests for Maven, npm, GitHub Actions, and Docker base images.
- Trivy GitHub Action is pinned to `aquasecurity/trivy-action@v0.36.0` so the workflow uses the post-2026 safe action line and current Trivy engine.

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

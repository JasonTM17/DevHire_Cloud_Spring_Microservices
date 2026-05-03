# DevHire Cloud Gmail SMTP Runbook

This runbook explains how to use Gmail as an optional real SMTP sender for `notification-service` without committing credentials. Local portfolio demos use Mailpit by default.

## Tiếng Việt

### Mục tiêu

`notification-service` luôn lưu internal notification trước, sau đó email worker mới gửi email. Local Docker mặc định dùng Mailpit để capture email an toàn. Gmail chỉ dùng khi cần kiểm thử SMTP thật và phải bật bằng compose override riêng.

Không bao giờ commit:

- Gmail app password.
- `.env` thật.
- log hoặc screenshot có credential.
- Kubernetes Secret thật.
- Terraform state hoặc plan có secret.

### Cấu hình local Gmail

Chạy script sau và nhập Google app password khi được hỏi:

```powershell
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com"
```

Hoặc đưa app password qua environment variable tạm thời:

```powershell
$env:DEVHIRE_GMAIL_APP_PASSWORD = "your-google-app-password"
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com" -AppPasswordEnvName DEVHIRE_GMAIL_APP_PASSWORD
Remove-Item Env:\DEVHIRE_GMAIL_APP_PASSWORD
```

Script sẽ ghi các biến `GMAIL_SMTP_*` vào `.env` local:

- `GMAIL_SMTP_FROM`
- `GMAIL_SMTP_REPLY_TO`
- `GMAIL_SMTP_USERNAME`
- `GMAIL_SMTP_APP_PASSWORD`

Google thường hiển thị app password theo nhóm có khoảng trắng. Script tự bỏ khoảng trắng trước khi ghi vào `.env`.

### Bật Gmail override

Local `docker-compose.yml` được pin vào Mailpit để tránh vô tình gửi email ra internet. Muốn dùng Gmail, phải bật override rõ ràng:

```powershell
docker compose -f docker-compose.yml -f docker-compose.smtp-gmail.example.yml up -d notification-service
```

Kiểm tra biến runtime:

```powershell
docker exec devhire-cloud-notification-service-1 printenv | Select-String -Pattern "SPRING_MAIL_HOST|GMAIL|SMTP"
```

### Smoke test SMTP độc lập

Sau khi cấu hình `.env`, có thể gửi thử một email trực tiếp qua Gmail SMTP:

```powershell
.\scripts\smoke-gmail-smtp.ps1 -To "your-gmail-address@gmail.com"
```

Script chỉ in host/người nhận, không in app password.

### Quay lại Mailpit

Để quay lại local sandbox an toàn:

```powershell
docker compose up -d --force-recreate notification-service
.\scripts\email-smoke.ps1 -GatewayUrl http://localhost:8080 -MailpitUrl http://localhost:8025
```

## English

### Goal

`notification-service` persists internal notifications first, then dispatches email asynchronously. The default local Docker stack uses Mailpit for safe SMTP capture. Gmail is optional and must be enabled explicitly with a compose override.

Never commit:

- Gmail app passwords.
- Real `.env` files.
- logs or screenshots containing credentials.
- real Kubernetes Secrets.
- Terraform state or generated plans containing secrets.

### Configure Gmail Locally

Interactive setup:

```powershell
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com"
```

Non-interactive setup:

```powershell
$env:DEVHIRE_GMAIL_APP_PASSWORD = "your-google-app-password"
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com" -AppPasswordEnvName DEVHIRE_GMAIL_APP_PASSWORD
Remove-Item Env:\DEVHIRE_GMAIL_APP_PASSWORD
```

The script writes only `GMAIL_SMTP_*` variables into the gitignored `.env` file. Generic `SPRING_MAIL_*` values are intentionally not used in `.env` so local Mailpit smoke tests cannot be overridden accidentally.

### Enable The Gmail Override

```powershell
docker compose -f docker-compose.yml -f docker-compose.smtp-gmail.example.yml up -d notification-service
```

Run a direct SMTP smoke test:

```powershell
.\scripts\smoke-gmail-smtp.ps1 -To "your-gmail-address@gmail.com"
```

Return to Mailpit:

```powershell
docker compose up -d --force-recreate notification-service
.\scripts\email-smoke.ps1 -GatewayUrl http://localhost:8080 -MailpitUrl http://localhost:8025
```

Production deployments should keep SMTP credentials in AWS Secrets Manager, External Secrets Operator, Kubernetes Secrets, or another secret store. Non-sensitive SMTP flags can remain in ConfigMaps/environment variables.

## 日本語

### 目的

`notification-service` はまず内部通知を保存し、その後に email worker が非同期でメールを送信します。ローカル Docker 環境では安全な SMTP sandbox として Mailpit を標準で使います。Gmail は任意の実 SMTP 検証用で、compose override を明示的に指定した場合だけ有効になります。

コミットしてはいけないもの:

- Gmail app password。
- 実際の `.env`。
- 認証情報を含むログやスクリーンショット。
- 本物の Kubernetes Secret。
- secret を含む Terraform state や plan。

### Gmail のローカル設定

対話形式:

```powershell
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com"
```

非対話形式:

```powershell
$env:DEVHIRE_GMAIL_APP_PASSWORD = "your-google-app-password"
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com" -AppPasswordEnvName DEVHIRE_GMAIL_APP_PASSWORD
Remove-Item Env:\DEVHIRE_GMAIL_APP_PASSWORD
```

script は gitignored の `.env` に `GMAIL_SMTP_*` だけを書き込みます。`SPRING_MAIL_*` を `.env` に書かないことで、Mailpit の smoke test が誤って外部 SMTP に送信される事故を防ぎます。

### Gmail override の有効化

```powershell
docker compose -f docker-compose.yml -f docker-compose.smtp-gmail.example.yml up -d notification-service
```

直接 SMTP smoke test:

```powershell
.\scripts\smoke-gmail-smtp.ps1 -To "your-gmail-address@gmail.com"
```

Mailpit に戻す:

```powershell
docker compose up -d --force-recreate notification-service
.\scripts\email-smoke.ps1 -GatewayUrl http://localhost:8080 -MailpitUrl http://localhost:8025
```

本番環境では SMTP credential を AWS Secrets Manager、External Secrets Operator、Kubernetes Secrets、または他の secret store で管理します。機密ではない SMTP flag だけを ConfigMap や environment variable に置きます。

# DevHire Cloud Gmail SMTP Runbook

This runbook explains how to use Gmail as the real SMTP sender for `notification-service` without committing credentials.

## Tiếng Việt

### Mục tiêu

`notification-service` có thể gửi email thật qua Gmail SMTP khi có notification mới hoặc khi trạng thái application thay đổi. App password phải nằm trong `.env` local, GitHub Actions secrets, Docker secret, Kubernetes Secret hoặc secret manager; không đưa vào source code, README, ConfigMap hay commit.

### Cấu hình nhanh cho local Docker

Chạy script sau và nhập Google app password khi được hỏi:

```powershell
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com"
```

Hoặc đưa app password qua environment variable tạm thời trong terminal riêng:

```powershell
$env:DEVHIRE_GMAIL_APP_PASSWORD = "your-google-app-password"
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com" -AppPasswordEnvName DEVHIRE_GMAIL_APP_PASSWORD
Remove-Item Env:\DEVHIRE_GMAIL_APP_PASSWORD
```

Script sẽ cập nhật `.env` local với các biến:

- `DEVHIRE_NOTIFICATION_EMAIL_ENABLED=true`
- `DEVHIRE_NOTIFICATION_EMAIL_FROM=<gmail address>`
- `DEVHIRE_NOTIFICATION_EMAIL_REPLY_TO=<gmail address>`
- `SPRING_MAIL_HOST=smtp.gmail.com`
- `SPRING_MAIL_PORT=587`
- `SPRING_MAIL_USERNAME=<gmail address>`
- `SPRING_MAIL_PASSWORD=<normalized app password>`
- `SPRING_MAIL_SMTP_AUTH=true`
- `SPRING_MAIL_SMTP_STARTTLS_ENABLE=true`
- `SPRING_MAIL_SMTP_STARTTLS_REQUIRED=true`
- `SPRING_MAIL_SMTP_SSL_TRUST=smtp.gmail.com`

Google hiển thị app password theo nhóm có khoảng trắng; script tự bỏ khoảng trắng trước khi ghi vào `.env` để Docker Compose parse ổn định hơn.

### Smoke test SMTP độc lập

Sau khi cấu hình `.env`, gửi thử một email trực tiếp qua Gmail SMTP:

```powershell
.\scripts\smoke-gmail-smtp.ps1 -To "your-gmail-address@gmail.com"
```

Script chỉ in host/người nhận, không in app password.

### Chạy lại stack

```powershell
docker compose down
docker compose up --build -d notification-service
```

Nếu chạy full stack:

```powershell
docker compose up --build -d
```

Khi `application-service` phát event, `notification-service` sẽ lưu internal notification trước, sau đó email worker xử lý queue trong bảng `notifications` với trạng thái `PENDING`, `SENDING`, `SENT`, `FAILED_RETRYABLE`, `FAILED_PERMANENT` hoặc `DISABLED`. SMTP lỗi tạm thời sẽ được retry với exponential backoff; notification nội bộ vẫn tồn tại để người dùng không mất thông báo.

## English

### Goal

Gmail can be used as the real SMTP provider for `notification-service`. Keep the app password in local `.env`, CI/CD secrets, Docker secrets, Kubernetes Secrets, or a secret manager. Never commit the app password.

### Local setup

```powershell
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com"
```

For non-interactive terminals:

```powershell
$env:DEVHIRE_GMAIL_APP_PASSWORD = "your-google-app-password"
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com" -AppPasswordEnvName DEVHIRE_GMAIL_APP_PASSWORD
Remove-Item Env:\DEVHIRE_GMAIL_APP_PASSWORD
```

Run an SMTP smoke test:

```powershell
.\scripts\smoke-gmail-smtp.ps1 -To "your-gmail-address@gmail.com"
```

Restart the notification service:

```powershell
docker compose up --build -d notification-service
```

Production deployments should move `SPRING_MAIL_USERNAME` and `SPRING_MAIL_PASSWORD` to a secret store and keep non-sensitive SMTP flags in ConfigMaps/environment variables.

## 日本語

### 目的

`notification-service` は Gmail SMTP を実際のメール送信プロバイダーとして利用できます。Google app password は `.env`、CI/CD secrets、Docker secrets、Kubernetes Secrets、または secret manager に保存し、Git にはコミットしません。

### ローカル設定

```powershell
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com"
```

非対話で実行する場合:

```powershell
$env:DEVHIRE_GMAIL_APP_PASSWORD = "your-google-app-password"
.\scripts\configure-gmail-smtp.ps1 -Username "your-gmail-address@gmail.com" -AppPasswordEnvName DEVHIRE_GMAIL_APP_PASSWORD
Remove-Item Env:\DEVHIRE_GMAIL_APP_PASSWORD
```

SMTP smoke test:

```powershell
.\scripts\smoke-gmail-smtp.ps1 -To "your-gmail-address@gmail.com"
```

`notification-service` を再起動:

```powershell
docker compose up --build -d notification-service
```

本番環境では `SPRING_MAIL_USERNAME` と `SPRING_MAIL_PASSWORD` を Secret として管理し、ConfigMap には機密でない SMTP 設定だけを置いてください。

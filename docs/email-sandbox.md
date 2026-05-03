# Local Email Sandbox With Mailpit

DevHire Cloud uses Mailpit as the default local SMTP sandbox so portfolio demos can show real HTML notification delivery without sending email to the internet.

## Runtime

- SMTP host inside Docker: `mailpit`
- SMTP port inside Docker: `1025`
- Mailpit UI: `http://localhost:8025`
- Mailpit API: `http://localhost:8025/api/v1/messages`
- Notification service default sender: `no-reply@devhire.local`

The Docker image is pinned to the stable `axllent/mailpit:v1.29` minor release. Mailpit exposes `/readyz` and `/livez` health endpoints, so Compose can wait for the sandbox before starting `notification-service`.

References:

- [Mailpit Docker images](https://mailpit.axllent.org/docs/install/docker/)
- [Mailpit healthcheck endpoints](https://mailpit.axllent.org/docs/integration/healthcheck/)

## Smoke Test

Start the stack:

```powershell
docker compose up -d --build
```

Run the email smoke:

```powershell
.\scripts\email-smoke.ps1 -GatewayUrl http://localhost:8080 -MailpitUrl http://localhost:8025
```

The script creates generated smoke data, submits an application, updates the application status, then verifies that Mailpit captured a DevHire notification email through the Mailpit API.

## Gmail And Real SMTP

Gmail remains an optional secret-backed profile for manual testing. The default `docker-compose.yml` is pinned to Mailpit so host-level `SPRING_MAIL_*` values cannot accidentally send portfolio smoke emails to the internet.

Use `scripts/configure-gmail-smtp.ps1` to write local `GMAIL_SMTP_*` values, then start the override explicitly:

```powershell
docker compose -f docker-compose.yml -f docker-compose.smtp-gmail.example.yml up -d notification-service
```

Rotate any app password that was pasted into chat, screenshots, logs, or issue comments.

Never commit:

- `.env`
- Gmail app passwords
- SMTP credentials
- screenshots showing credentials
- raw email headers containing secrets

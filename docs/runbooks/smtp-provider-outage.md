# Runbook: SMTP Provider Outage

## Scope

Use this when Gmail SMTP or another real SMTP provider fails, rate limits, or rejects authentication.

## Signals

- Notification delivery status remains `FAILED_RETRYABLE`.
- Email retry queue grows.
- SMTP logs show auth, throttling, or network errors.
- Internal notifications are still created but email is not delivered.

## Triage

```powershell
docker compose logs --tail=200 notification-service
.\scripts\email-smoke.ps1 -GatewayUrl http://localhost:8080 -MailpitUrl http://localhost:8025
```

Check whether local Mailpit works. If Mailpit works and real SMTP fails, the issue is provider credentials, quota, DNS, or network path.

## Mitigation

1. Keep internal notifications enabled.
2. Switch local and staging to Mailpit or sandbox provider while real SMTP recovers.
3. Rotate the SMTP app password if auth failed.
4. Reduce send rate if provider throttles.
5. Resume retry worker after provider health is confirmed.

## Verification

```powershell
.\scripts\email-smoke.ps1 -GatewayUrl http://localhost:8080 -MailpitUrl http://localhost:8025
```

Expected result: notification row is stored, email template renders, and Mailpit captures the message in local mode.


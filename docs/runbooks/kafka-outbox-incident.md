# Runbook: Kafka And Outbox Incident

## Scope

Use this when Kafka is down, consumers lag, or `outbox_events` rows remain `PENDING`, `FAILED`, or `DEAD_LETTER`.

## Signals

- Kafka container unhealthy.
- Outbox publisher failure counter increases.
- Notification or audit events do not appear after a business action.
- `application.events`, `job.events`, `company.events`, `audit.events`, or `notification.events` consumers are delayed.

## Triage

```powershell
docker compose ps kafka
docker compose logs --tail=200 kafka
docker compose logs --tail=200 application-service
docker compose logs --tail=200 notification-service
docker compose logs --tail=200 audit-service
```

Check service-owned outbox tables in the affected database and count statuses:

```sql
select status, count(*) from outbox_events group by status order by status;
```

## Mitigation

1. Restore Kafka first.
2. Restart affected publishers only after Kafka is healthy.
3. Let `PENDING` and retryable `FAILED` rows replay automatically.
4. For `DEAD_LETTER`, inspect payload, fix the consumer/publisher bug, and manually replay only after approval.
5. Do not delete outbox rows to make dashboards green.

## Verification

```powershell
.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080
.\scripts\chaos-smoke.ps1 -GatewayUrl http://localhost:8080 -Scenario kafka -Recover
```

Expected result: business actions succeed, outbox pending rows drain, notification/audit consumers process each `eventId` once.


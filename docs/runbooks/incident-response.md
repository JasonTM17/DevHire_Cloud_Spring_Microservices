# Incident Response Runbook

## Triage

1. Check API Gateway health: `GET http://localhost:8080/actuator/health`.
2. Check service health in Docker: `docker compose ps`.
3. Check recent logs: `docker compose logs --tail=200 <service>`.
4. Open Grafana and inspect request rate, error rate, latency, JVM pressure, and outbox failures.
5. Check Kafka/OpenSearch/PostgreSQL health if symptoms point to infrastructure.

## Common Incidents

### Gateway 5xx Spike

- Check downstream service health.
- Confirm Redis is healthy for rate limiting.
- Inspect gateway logs for route failures.
- Validate CORS and JWT configuration if failures are browser-only.

### Search Is Empty Or Slow

- Check `job-service` health.
- Check OpenSearch cluster health.
- Confirm PostgreSQL fallback is enabled.
- Re-run smoke flow and inspect `devhire_jobs` index.

### Notifications Not Delivered

- Check notification-service health.
- Inspect email delivery status in DB.
- Confirm SMTP env vars are present only in local `.env` or secret manager.
- Check retry/backoff settings before manual resend.

## Recovery

- Restart one service: `docker compose up -d --force-recreate <service>`.
- Restart full stack: `docker compose down && docker compose up --build`.
- Re-run API smoke: `.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080`.

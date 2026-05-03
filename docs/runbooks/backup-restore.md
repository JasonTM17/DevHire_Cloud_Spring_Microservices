# Backup And Restore Runbook

## Local Backup

Use `pg_dump` from the PostgreSQL container for each service database:

```powershell
docker exec devhire-postgres pg_dump -U devhire devhire_auth > backup-devhire-auth.sql
docker exec devhire-postgres pg_dump -U devhire devhire_job > backup-devhire-job.sql
```

Repeat for:

- `devhire_user`
- `devhire_company`
- `devhire_application`
- `devhire_notification`
- `devhire_audit`

## Local Restore

```powershell
Get-Content backup-devhire-job.sql | docker exec -i devhire-postgres psql -U devhire devhire_job
```

## Production Notes

- Prefer managed PostgreSQL snapshots for production.
- Store backups encrypted.
- Test restore regularly in staging.
- Keep OpenSearch as rebuildable search projection; the source of truth remains service databases.
- Never include backup dumps in git.

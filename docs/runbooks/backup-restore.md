# Backup, Restore, And Disaster Recovery Runbook

DevHire Cloud uses service-owned PostgreSQL databases. Backups are taken per database, not as one shared monolith, so recovery can follow each microservice ownership boundary.

## Scope

Service databases:

- `devhire_auth`
- `devhire_user`
- `devhire_company`
- `devhire_job`
- `devhire_application`
- `devhire_notification`
- `devhire_audit`
- `devhire_ai`

OpenSearch is treated as a rebuildable projection. PostgreSQL remains the source of truth.

## Portfolio RPO/RTO Targets

- Local portfolio RPO: latest manual backup generated before a destructive test.
- Local portfolio RTO: under 30 minutes for one service database restore.
- Production sample RPO: 15 minutes with managed PostgreSQL PITR.
- Production sample RTO: 60 minutes for single-service database restore into staging or production emergency target.

## Local Backup

Start the stack first:

```powershell
docker compose up -d postgres postgres-init
```

Back up all service databases:

```powershell
.\scripts\backup-postgres.ps1 -OutputDir .\backups -Databases all
```

Back up one database:

```powershell
.\scripts\backup-postgres.ps1 -OutputDir .\backups -Databases devhire_job
```

The script creates PostgreSQL custom-format `.dump` files plus a JSON manifest. `backups/` is intentionally ignored by Git.

## Local Restore

Restore is blocked by default and requires an explicit confirmation flag:

```powershell
.\scripts\restore-postgres.ps1 -InputDir .\backups -Database devhire_job -ConfirmRestore
```

To restore a specific dump file:

```powershell
.\scripts\restore-postgres.ps1 -InputDir .\backups -Database devhire_job -BackupFile devhire_job-20260503-120000.dump -ConfirmRestore
```

The restore uses `pg_restore --clean --if-exists --exit-on-error`, so it can replace existing objects in the target database. Confirm the target environment before running it.

## DR Verification

Run a nondestructive DR check:

```powershell
.\scripts\dr-verify.ps1 -GatewayUrl http://localhost:8080
```

Run with API smoke after backup validation:

```powershell
.\scripts\dr-verify.ps1 -GatewayUrl http://localhost:8080 -RunApiSmoke
```

The DR script:

- waits for Gateway readiness,
- backs up critical workflow databases,
- verifies dump files are non-empty,
- checks Flyway metadata is queryable,
- optionally runs the Gateway API smoke flow.

Generated DR reports live under `reports/`, which is ignored by Git.

## Production Notes

- Prefer managed RDS automated backups, PITR, and encrypted snapshots.
- Keep Terraform state and backup artifacts outside the repository.
- Store backup artifacts encrypted with access logging.
- Restore into staging before production whenever possible.
- Rebuild OpenSearch from job-service data after PostgreSQL recovery.
- Record restore evidence in an incident or release checklist without attaching raw dumps.

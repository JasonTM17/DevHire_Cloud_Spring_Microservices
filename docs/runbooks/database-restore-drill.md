# Runbook: Database Restore Drill

## Scope

Use this to prove service-owned PostgreSQL backup and restore behavior for local portfolio evidence. Production restore should use managed RDS snapshots plus the same service ownership rules.

## Drill Steps

1. Start the local stack.
2. Create a backup directory outside tracked source or under ignored `backups/`.
3. Back up all service databases:

```powershell
.\scripts\backup-postgres.ps1 -OutputDir .\backups -Databases all
```

4. Restore one non-critical local database with explicit confirmation:

```powershell
.\scripts\restore-postgres.ps1 -InputDir .\backups -Database devhire_job -ConfirmRestore
```

5. Run post-restore verification:

```powershell
.\scripts\dr-verify.ps1 -GatewayUrl http://localhost:8080
.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080
```

## Guardrails

- Restore is not destructive unless `-ConfirmRestore` is provided.
- Do not restore one service database from another service backup.
- Do not commit backup files.
- Record RPO/RTO and drill date in release evidence.

## Expected Evidence

- Backup files exist in ignored storage.
- Restored service responds through Gateway.
- Search and application flows still use service APIs, not cross-database reads.


# Repository Hygiene Guard

`scripts/repo-hygiene.ps1` checks that the repository remains clean as the portfolio grows.

It validates:

- forbidden runtime artifacts are not tracked,
- `.gitignore` keeps local secrets, logs, reports, backups, and Terraform state out of Git,
- visible untracked sensitive artifacts are not waiting to be accidentally added,
- `.gitattributes` keeps text normalization enabled.

Run:

```powershell
.\scripts\repo-hygiene.ps1
```

The script writes ignored JSON and Markdown reports under `reports/repo-hygiene/`.

Recommended fast reviewer gate:

```powershell
.\scripts\portfolio-verify.ps1 -Docs -Docker
.\scripts\evidence-audit.ps1
.\scripts\repo-hygiene.ps1
```

This guard is intentionally local-safe. It does not delete files and does not mutate Git history.

## Local Artifact Cleanup

Use the cleanup guard when the workspace has generated files that make local review noisy:

```powershell
.\scripts\clean-local-artifacts.ps1 -DryRun
.\scripts\clean-local-artifacts.ps1 -Apply
```

The apply mode removes generated reports, Maven `target/` directories, frontend build/test outputs, and JVM crash logs. It does not remove `.env` or `frontend/node_modules` unless explicitly requested:

```powershell
.\scripts\clean-local-artifacts.ps1 -Apply -IncludeLocalEnv
.\scripts\clean-local-artifacts.ps1 -Apply -IncludeNodeModules
```

Generated cleanup reports are ignored under `reports/local-cleanup/`.

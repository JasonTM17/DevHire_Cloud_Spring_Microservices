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

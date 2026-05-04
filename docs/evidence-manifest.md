# Portfolio Evidence Manifest

`docs/evidence-manifest.json` is a machine-checkable index of the proof that makes DevHire Cloud reviewable as a production engineering portfolio.

It groups evidence into:

- microservice source,
- runtime infrastructure,
- verification scripts,
- CI/CD and security,
- portfolio documentation,
- visual screenshots,
- operations runbooks.

Run the audit:

```powershell
.\scripts\evidence-audit.ps1
```

The script validates required files, checks that forbidden runtime/secret artifacts are not tracked by Git, and writes ignored reports under `reports/evidence-audit/`.

Use it with the reviewer verifier:

```powershell
.\scripts\portfolio-verify.ps1 -Docs -Docker
.\scripts\evidence-audit.ps1
```

This is intentionally not a replacement for runtime smoke. It is the fast evidence map that answers: "where is the proof?"

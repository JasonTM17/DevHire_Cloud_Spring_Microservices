# Portfolio Evidence Manifest

`docs/evidence-manifest.json` is a machine-checkable index of the proof that makes DevHire Cloud reviewable as a production engineering portfolio.

It groups evidence into:

- microservice source,
- runtime infrastructure,
- verification scripts,
- CI/CD and security,
- portfolio documentation,
- visual screenshots,
- Stitch full-app route screenshots,
- operations runbooks.

Run the audit:

```powershell
.\scripts\evidence-audit.ps1
```

The script validates required files, checks that forbidden runtime/secret artifacts are not tracked by Git, and writes ignored reports under `reports/evidence-audit/`.

v0.6.x adds Stitch route-matrix evidence for candidate, employer, admin, AI, and platform surfaces while keeping dependency backlog and hosted workflow state auditable through `scripts/dependabot-zero-noise.ps1` and `scripts/github-workflow-status.ps1`.

Promote the full-app Stitch screenshots after a successful Playwright capture:

```powershell
cd frontend
npm run e2e:all
cd ..
.\scripts\screenshot-promote.ps1 -Set Stitch
.\scripts\visual-evidence-audit.ps1
```

Use it with the reviewer verifier:

```powershell
.\scripts\portfolio-verify.ps1 -Docs -Docker
.\scripts\evidence-audit.ps1
```

This is intentionally not a replacement for runtime smoke. It is the fast evidence map that answers: "where is the proof?"

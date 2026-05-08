# GitHub Owner Actions

These actions require repository owner permissions and are intentionally not forced by CI.

## Current Target

| Field | Value |
|---|---|
| Latest public release | `v0.5.1` |
| Homepage | `https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.5.1` |
| Default branch | `master` |
| Branch protection | Required |
| Wiki | Target disabled; run owner-authenticated governance apply if public dry-run still reports enabled |
| Merge commits | Disabled |
| Delete merged branches | Enabled |

## Apply Or Verify

```powershell
.\scripts\github-governance.ps1 -DryRun
.\scripts\github-facade-assert.ps1
.\scripts\repository-health.ps1
.\scripts\pr-stack-status.ps1
```

Owner-token apply path:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\github-governance.ps1 -Apply -MetadataOnly
.\scripts\github-governance.ps1 -Apply -BranchProtectionOnly
Remove-Item Env:\GITHUB_TOKEN
```

Audited workflow path:

1. Add repository secret `REPO_GOVERNANCE_TOKEN`.
2. Run `Repository Governance` with `mode=dry-run`.
3. Review the artifact.
4. Run `mode=apply-metadata`.
5. Run `mode=apply-branch-protection`.
6. Run `mode=verify-only`.

## Required Public Metadata

Description:

```text
Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.
```

Topics:

```text
java, spring-boot, microservices, spring-cloud, postgresql, kafka, opensearch, redis, docker, kubernetes, terraform, aws, prometheus, grafana, nextjs, anthropic, claude, rag, devops, portfolio
```

## Release And Package Notes

- Keep `v0.5.1` visible as the current production portfolio release.
- Future release tags must have `docs/release-notes/<tag>.md`.
- GHCR package visibility may still require owner/account settings.

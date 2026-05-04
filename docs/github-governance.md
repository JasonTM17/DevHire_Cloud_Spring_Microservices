# GitHub Governance Automation

DevHire Cloud keeps repository presentation as a first-class portfolio artifact. The backend/runtime stack already has strong evidence; this document covers the public GitHub surface that a recruiter sees before opening any source file.

## Current Public State

The public GitHub API snapshot taken during the v0.4.1 governance pass showed:

| Area | Status |
|---|---|
| Repository visibility | Public |
| About description | Empty on GitHub UI until owner apply |
| Homepage | Empty on GitHub UI until owner apply |
| Topics | Empty on GitHub UI until owner apply |
| Latest release | `v0.3.0` public |
| Default branch | `master` |
| Branch protection | Not enabled in the public branch list |

The repository content now includes automation and exact owner fallback steps. If a short-lived owner token is available, the GitHub metadata can be applied from the local shell without pasting the token into chat or committing it.

## Automation

Preview the target state:

```powershell
.\scripts\github-governance.ps1 -DryRun
```

Apply About, homepage, and topics from an owner shell:

```powershell
$env:GITHUB_TOKEN = "<short-lived-owner-token>"
.\scripts\github-governance.ps1 -Apply
Remove-Item Env:\GITHUB_TOKEN
```

The script writes sanitized JSON and Markdown reports under `reports/github-governance/`. That directory is ignored because it is generated evidence.

## Target Repository Metadata

Description:

```text
Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.
```

Homepage:

```text
https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.3.0
```

Topics:

```text
java, spring-boot, microservices, spring-cloud, postgresql, kafka, opensearch, redis, docker, kubernetes, terraform, aws, prometheus, grafana, nextjs, anthropic, claude, rag, devops, portfolio
```

## Token Safety

- The token is read only from `GITHUB_TOKEN` in the current shell.
- The token is never printed, persisted, or written into generated reports.
- Generated reports store only sanitized status, target metadata, current public metadata, and owner action summaries.
- If `GITHUB_TOKEN` is not set, `-Apply` fails fast and `-DryRun` remains fully useful for evidence.

## Owner Action Status

The repo can be reviewed professionally before owner metadata is applied because the target values and automation are committed. The remaining public UI actions are tracked in:

- [GitHub owner actions](github-owner-actions.md)
- [Branch protection](branch-protection.md)
- [Repository health dashboard](repository-health.md)

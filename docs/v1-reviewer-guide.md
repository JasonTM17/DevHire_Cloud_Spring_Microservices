# DevHire Cloud v1 Reviewer Guide

This guide is the fastest path for a senior backend, DevOps, cloud, or solution architecture reviewer to evaluate DevHire Cloud without getting lost in the repository.

## 5-Minute Review

Open these first:

1. Root `README.md`.
2. [Review evidence pack](REVIEW_EVIDENCE.md).
3. [Production engineering scorecard](production-engineering-scorecard.md).
4. [Remaining gaps and roadmap](remaining-gaps-and-roadmap.md).
5. [v1.0.0 release evidence](release-evidence/v1.0.0.md).

What to check:

- The project does not claim to be a live SaaS system.
- GitHub facade, branch protection, and Dependabot posture are visible.
- Runtime, cloud, security, and docs verification commands exist.

## 15-Minute Review

Open:

1. [Service catalog](service-catalog.md).
2. [Architecture review index](architecture-review-index.md).
3. [Runtime acceptance matrix](runtime-acceptance-matrix.md).
4. [Cloud readiness review](cloud-readiness-review.md).
5. [Security evidence](security-evidence.md).

Run:

```powershell
.\scripts\v1-release-verify.ps1 -Cloud
```

Expected result:

- docs quality passes;
- trilingual parity passes;
- evidence manifest passes;
- Docker Compose config passes;
- Terraform/Helm/K8s/cloud policy checks pass without AWS credentials.

## 30-Minute Review

Run:

```powershell
.\scripts\v1-release-verify.ps1 -Backend -Frontend -Cloud
```

Then inspect:

- Testcontainers/integration tests for service-owned data behavior.
- Gateway security and rate-limit tests.
- AI fallback and citation safety tests.
- Frontend Playwright smoke coverage.
- Coverage ratchet script.

## Runtime Review

When Docker is available:

```powershell
docker compose up -d --build
.\scripts\v1-runtime-evidence.ps1 -GatewayUrl http://localhost:8080
```

This verifies:

- Gateway runtime path.
- API smoke and reliability scripts.
- OpenAPI runtime conformance.
- custom domain metrics.
- demo data aggregates.
- optional curated screenshot evidence.

## Cloud Review

Run:

```powershell
.\scripts\v1-cloud-evidence.ps1
```

This verifies:

- Terraform validation for AWS environments.
- Terraform race-safety.
- Helm and Kubernetes render posture.
- cloud policy guardrails.
- cloud evidence summary.

No AWS credentials are required. No Terraform apply is performed.

## Demo Review

Use:

```powershell
.\scripts\v1-demo-data-verify.ps1
```

When Docker is running:

```powershell
.\scripts\v1-demo-data-verify.ps1 -FromDocker
```

Review:

- deterministic service-owned seed data;
- runtime database aggregate counts;
- dashboard support data;
- search and pagination evidence.

## Red Flags That Should Not Appear

- Raw secrets or `.env` in tracked files.
- `latest` image tags in production deployment paths.
- Runtime screenshots containing tokens or raw local reports.
- README claims that AWS is already deployed.
- Direct pushes to `master`.
- Required checks disabled to force a merge.

## Reviewer Conclusion Template

Suggested conclusion if checks pass:

> DevHire Cloud is a production-grade portfolio system with real microservice boundaries, runtime verification, cloud blueprint evidence, security scanning, and trilingual reviewer documentation. It is not a live customer SaaS deployment, but it is apply-ready for a controlled staging cloud phase.

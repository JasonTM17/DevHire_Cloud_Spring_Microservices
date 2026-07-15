# DevHire Cloud - Microservices Recruitment Platform

DevHire Cloud は、Java 21 / Spring Boot 4.0 で構築した採用プラットフォームの production engineering portfolio です。小規模な ITviec / LinkedIn Jobs のようなドメインを使い、明確な service boundary、service-owned database、Kafka/outbox、OpenSearch、observability、Docker/Kubernetes/Terraform、CI/CD、security evidence、Claude Haiku AI assistant を示します。

## Public Repository Status

| Signal | Current |
|---|---|
| Latest public release | [v0.6.0](https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.6.0) |
| Current development cycle | `0.6.0-SNAPSHOT` release cut; next snapshot bump is a post-release maintenance step |
| v0.6 Stitch app | `master` に merged。Code Assessment Studio は candidate grading、employer review、admin health の flagship workflow |
| Branch governance | `master` protected、PR-based release flow |
| Dependabot queue | 2026-05-14 の live scan では open Dependabot PR が 20 件。curation dry-run は 11 safe-batch、3 manual-review、6 defer-major に分類し、zero-noise は CI/runtime smoke が green になるまで clean merge candidate 0 件と報告 |
| v1 status | Roadmap と acceptance checklist のみ。release tag ではありません |

## Reviewer Quick Links

| Need | Link |
|---|---|
| Documentation index | [INDEX.md](INDEX.md) |
| Vietnamese README | [../README.md](../README.md) |
| English README | [README_EN.md](README_EN.md) |
| Current status | [status.md](status.md) |
| Evidence pack | [REVIEW_EVIDENCE.md](REVIEW_EVIDENCE.md) |
| Code assessment proof | [code-assessment-reviewer-proof.md](code-assessment-reviewer-proof.md) |
| v0.6 Stitch redesign | [ui-redesign-v0.6.md](ui-redesign-v0.6.md) |
| Architecture | [architecture-review-index.md](architecture-review-index.md) |
| Service catalog | [service-catalog.md](service-catalog.md) |
| Security evidence | [security-evidence.md](security-evidence.md) |
| Cloud readiness | [cloud-readiness-review.md](cloud-readiness-review.md) |
| Production scorecard | [production-engineering-scorecard.md](production-engineering-scorecard.md) |

## Architecture Proof

| Layer | Implementation |
|---|---|
| Edge | Spring Cloud Gateway、JWT validation、CORS、rate limiting、centralized error response |
| Core services | auth、user、company、job、application、assessment-runner、notification、audit、AI |
| Data ownership | service ごとの PostgreSQL database/schema、Flyway migration、shared JPA entity なし |
| Messaging | Kafka events、transactional outbox、idempotent consumers |
| Search | OpenSearch adapter と PostgreSQL fallback |
| AI | Claude Haiku assistant、citations、tool traces、safety guardrails、metrics |
| Code assessment | Java `CandidateSolution.solve(String input)` contract、Judge0-compatible internal runner boundary、hidden/visible cases、75/25 runtime-plus-static scoring、integrity signals、employer review、admin health metrics |
| Observability | Actuator、Prometheus、Grafana、Loki、Tempo、OpenTelemetry、domain KPI dashboards |
| Security | JWT/RBAC、refresh token rotation、Gitleaks、Trivy、CodeQL、SBOM、protected `master` |
| Delivery | Maven、Docker matrix、GitHub Actions、Helm、Kubernetes、Argo CD、AWS Terraform blueprint |

## v0.6 Full-App Product Surface

| Area | Routes |
|---|---|
| Candidate | `/jobs`, `/jobs/[id]`, `/candidate`, applications, profile, code assessments, offers, interview prep, roadmap, skill analytics, community |
| Employer | `/employer`, `/companies/[slug]`, code-review queue |
| Admin/Ops | `/admin`, `/admin/ai`, code assessment health |
| Platform | `/assistant`, `/platform/observability`, `/platform/cloud`, `/platform/releases` |

v0.6 implementation は Stitch project `projects/5421325194779586117` に沿っており、`master` に merged 済みです。Primary screenshots は raw UUID、`UNKNOWN`、loading-only state、smoke label、offline banner、fallback banner を含まないように検証されます。Code Assessment Studio は flagship product feature として、candidate coding workspace、visible runner cases、hidden server-side scoring、75/25 runtime-plus-static scoring、integrity/similarity posture、redacted list/detail boundaries、attempt metadata、code hash、rubric versioning、employer review dossier、admin assessment health を提供します。runner boundary は internal `assessment-runner-service` と Judge0-compatible adapter を使い、domain ownership は `application-service` に残します。

## Cloud State Matrix

| Target | State | Verification |
|---|---|---|
| Docker Compose | Full local stack | `docker compose config --quiet` |
| Raw Kubernetes | render 可能、`latest` なし、`ai-service` included | `kubectl kustomize deploy/k8s` |
| Helm | local/staging/prod/AWS values | `.\scripts\cloud-verify.ps1` |
| Terraform AWS | blueprint validate only、AWS credentials 不要 | `.\scripts\terraform-validate.ps1` |
| GitOps | `master` を指す Argo CD samples | [deploy/gitops](../deploy/gitops) |

## Run Locally

```powershell
docker compose up -d --build
.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080
```

Docker なしの frontend preview:

```powershell
cd frontend
npm ci
npm run e2e:all
```

Portfolio verification:

```powershell
.\scripts\version-consistency.ps1
.\scripts\portfolio-verify.ps1 -Docs -Docker -Cloud
.\scripts\docs-parity.ps1
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@devhire.local` | `Admin@123456` |
| Employer | `employer@devhire.local` | `Employer@123456` |
| Candidate | `candidate@devhire.local` | `Candidate@123456` |

## Product Screenshots

| Jobs | Job Detail |
|---|---|
| ![Jobs](screenshots/jobs-page.png) | ![Job detail](screenshots/job-detail.png) |

| Candidate | Employer | Admin |
|---|---|---|
| ![Candidate](screenshots/candidate-dashboard.png) | ![Employer](screenshots/employer-dashboard.png) | ![Admin](screenshots/admin-dashboard.png) |

| Code Assessment Studio | Employer Review Dossier | Admin Assessment Health |
|---|---|---|
| ![Candidate assessment](screenshots/stitch/candidate-assessments.png) | ![Employer review](screenshots/stitch/employer-pipeline.png) | ![Admin assessment health](screenshots/stitch/admin-control-plane.png) |

| Stitch Candidate Apps | Stitch Cloud | Stitch Releases |
|---|---|---|
| ![Candidate applications](screenshots/stitch/candidate-applications.png) | ![Cloud](screenshots/stitch/platform-cloud.png) | ![Releases](screenshots/stitch/platform-releases.png) |

| Assistant | Grafana SLO | Prometheus Rules |
|---|---|---|
| ![Assistant](screenshots/assistant-page.png) | ![Grafana SLO](screenshots/ops-grafana-slo.png) | ![Prometheus rules](screenshots/ops-prometheus-rules.png) |

The full visual evidence set is machine-checked in [evidence-manifest.json](evidence-manifest.json).

## v1 Roadmap

`v1.0.0` はまだ release されていません。v1 roadmap は product UX、backend integration maturity、API/event compatibility、observability SLO、deterministic data depth、cloud apply-ready evidence、supply-chain hardening を対象にします。[v1 reviewer guide](v1-reviewer-guide.md)、[v1 demo script](v1-demo-script.md)、[v1 production gap register](v1-production-gap-register.md) を参照してください。

## Honest Scope

これは production engineering portfolio であり、実際の customer SaaS traffic を主張するものではありません。AWS は apply-ready blueprint であり、credentialed deployment phase が別途承認されるまで `terraform apply` は実行しません。

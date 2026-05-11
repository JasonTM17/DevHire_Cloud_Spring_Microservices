# Service Catalog

This catalog is the reviewer-facing inventory for DevHire Cloud services. It explains ownership, data boundaries, communication style, and the files worth opening during a senior engineering review.

## Service Ownership Matrix

| Service | Port | Owned Database | Public Surface | Main Responsibility |
|---|---:|---|---|---|
| api-gateway | 8080 | none | `/api/**` | Public ingress, route mapping, JWT validation, CORS, Redis rate limit, security headers |
| auth-service | 8081 | `devhire_auth` | `/auth/**` | Register, login, refresh rotation, logout blacklist, `/auth/me`, auth audit events |
| user-service | 8082 | `devhire_user` | `/users/**` | Candidate and employer profile management |
| company-service | 8083 | `devhire_company` | `/companies/**`, `/admin/companies/**` | Employer company onboarding and admin approval |
| job-service | 8084 | `devhire_job` | `/jobs/**`, `/admin/jobs/**`, `/internal/jobs/**` | Job posting lifecycle, OpenSearch search, PostgreSQL fallback, internal job checks |
| application-service | 8085 | `devhire_application` | `/jobs/{jobId}/applications`, `/applications/**`, `/employer/jobs/**`, `/candidate/code-assessments/**`, `/employer/code-assessments/**` | Candidate application workflow, duplicate prevention, status history, code assessment domain owner |
| notification-service | 8086 | `devhire_notification` | `/notifications/**` | Internal notifications, email queue, Mailpit/Gmail SMTP profiles, idempotent event consumers |
| audit-service | 8087 | `devhire_audit` | `/admin/audit-logs` | Administrative audit log ingestion and filtering |
| ai-service | 8088 | `devhire_ai` | `/ai/**`, `/admin/ai/**` | Claude Haiku assistant, RAG-style citations, tool traces, provider fallback, AI audit events |
| assessment-runner-service | 8089 | none | `/internal/assessment-runs`, `/internal/assessment-runs/health`, `/actuator/prometheus` | Judge0-compatible internal adapter for isolated visible/hidden code test execution, fail-closed health, and runner metrics |
| frontend | 3001 | none | Next.js pages | Recruiter demo UI for jobs, dashboards, assistant, and operations evidence |

## Data Boundary Rules

- Each service owns its schema/database and Flyway migrations.
- No service imports another service's JPA entity.
- Cross-service reads use API contracts, Feign/WebClient, or Gateway routes.
- Cross-service writes and side effects use Kafka events and transactional outbox where reliability matters.
- `common-lib` contains shared contracts, error envelopes, security headers, event DTOs, and outbox helpers; it does not contain business workflow logic.

## Synchronous Contracts

| Consumer | Provider | Purpose | Evidence |
|---|---|---|---|
| application-service | job-service | Validate job visibility and employer ownership before apply/status update | `application-service/src/main/java/com/devhire/application/client/JobClient.java`, `job-service/src/main/java/com/devhire/job/controller/InternalJobController.java` |
| application-service | assessment-runner-service | Run visible/hidden code test cases without exposing hidden payloads to the frontend | `application-service/src/main/java/com/devhire/application/client/AssessmentRunnerClient.java`, `assessment-runner-service/src/main/java/com/devhire/runner/controller/AssessmentRunnerController.java` |
| job-service | company-service | Verify company is approved before job publication | `job-service/src/main/java/com/devhire/job/client/CompanyClient.java`, `company-service/src/main/java/com/devhire/company/controller/InternalCompanyController.java` |
| ai-service | job-service | Search and explain job results for assistant tool calls | `ai-service/src/main/java/com/devhire/ai/tool/JobSearchTool.java` |
| frontend | api-gateway | Product demo and role dashboards | `frontend/src/lib/api.ts`, `frontend/e2e/*.spec.ts` |

## Asynchronous Events

| Topic | Producers | Consumers | Notes |
|---|---|---|---|
| `audit.events` | auth, company, job, application, ai | audit-service | Administrative activity stream; consumers dedupe by `eventId`. |
| `company.events` | company-service | audit-service, future consumers | Company approval/onboarding events. |
| `job.events` | job-service | audit-service, future search/event consumers | Job approval/publication lifecycle. |
| `application.events` | application-service | notification-service, audit-service | Application submitted/status changed events. |
| `notification.events` | notification-service | audit-service/future channels | Notification creation and delivery telemetry. |

## Core Review Files

| Area | Files |
|---|---|
| Shared error/event/security contracts | `common-lib/src/main/java/com/devhire/common/**` |
| Gateway security and routing | `api-gateway/src/main/java/com/devhire/gateway/**`, `api-gateway/src/main/resources/application.yml` |
| Auth token flow | `auth-service/src/main/java/com/devhire/auth/service/AuthService.java`, `auth-service/src/main/java/com/devhire/auth/security/JwtService.java` |
| Job search adapters | `job-service/src/main/java/com/devhire/job/search/**` |
| Application workflow | `application-service/src/main/java/com/devhire/application/service/ApplicationWorkflowService.java` |
| Notification delivery | `notification-service/src/main/java/com/devhire/notification/email/**`, `notification-service/src/main/java/com/devhire/notification/event/**` |
| AI assistant safety | `ai-service/src/main/java/com/devhire/ai/service/AiAssistantService.java`, `docs/ai-safety.md` |
| Code assessment runner | `assessment-runner-service/src/main/java/com/devhire/runner/**`, `docs/runbooks/code-assessment-runner.md` |
| Runtime proof | `scripts/portfolio-verify.ps1`, `scripts/runtime-reliability.ps1`, `docs/runtime-reliability-review.md` |

## Health, Docs, And Operations URLs

| Surface | URL |
|---|---|
| Frontend | `http://localhost:3001` |
| Gateway readiness | `http://localhost:8080/actuator/health/readiness` |
| Assessment runner health | `http://localhost:8089/internal/assessment-runs/health` |
| Assessment runner metrics | `http://localhost:8089/actuator/prometheus` |
| Service OpenAPI | `http://localhost:<service-port>/v3/api-docs` |
| Swagger UI | `http://localhost:<service-port>/swagger-ui/index.html` |
| Prometheus | `http://localhost:9090` |
| Grafana SLO dashboard | `http://localhost:3000/d/devhire-slo-overview/devhire-cloud-slo-overview` |
| Mailpit | `http://localhost:8025` |
| OpenSearch | `http://localhost:9200` |

## Review Questions This Catalog Answers

- Which service owns which data?
- Which service boundary is synchronous and why?
- Which workflows are event-driven?
- Where are retry/idempotency and outbox behaviors implemented?
- How does the frontend prove the backend platform is usable?
- How can a reviewer verify the platform without reading every file?

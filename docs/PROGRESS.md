# DevHire Cloud Progress

This file records implementation progress, verification commands, and commit boundaries.

## Phase 0 - Repository bootstrap

- Initialized the Git repository at the workspace root.
- Added baseline ignore rules for Java, Maven, IDE files, local secrets, logs, and runtime artifacts.
- Created the documentation progress log.

Verification:

- `git status --short --branch` will be checked before commit.
- `mvn clean verify` is not applicable yet because the Maven parent project is introduced in Phase 1.

Committed as `chore: initialize microservices monorepo structure`.

## Phase 1 - Parent build + common config

- Added a Maven multi-module parent build using Spring Boot 3.5.13, Spring Cloud 2025.0.2, Java 21 release target, JaCoCo, Surefire, Failsafe, Springdoc, Testcontainers, JJWT, and shared dependency management.
- Added service modules: `api-gateway`, `auth-service`, `user-service`, `company-service`, `job-service`, `application-service`, `notification-service`, and `audit-service`.
- Added `common-lib` with shared API response, error model, field violations, pagination response, security roles, correlation id filter, constants, and event DTO contracts.
- Added minimal Spring Boot application entrypoints and baseline actuator config for every service.

Verification:

- `mvn clean verify` initially failed because the previous JVM crash left corrupted Maven artifacts in `C:\Users\Admin\.m2\repository`.
- Removed only the corrupted artifact directories and reran with JDK 26 compiling to Java 21 bytecode.
- `mvn -T1 clean verify` passed on 2026-05-02.

Committed as `chore: configure parent build and shared conventions`.

## Phase 2 - Docker Compose infrastructure

- Added Docker Compose for PostgreSQL, Redis, Kafka, Prometheus, Grafana, Loki, Tempo, OpenTelemetry Collector, and all backend services.
- Added one PostgreSQL container with separate databases per service through `infra/postgres/init/01-create-databases.sql`.
- Added multi-stage Dockerfiles for every service using Java 21 runtime and a non-root `devhire` user.
- Added Prometheus scrape config, Grafana datasource/dashboard provisioning, Tempo config, OTel Collector config, `.dockerignore`, `.env.example`, and a production compose sample.
- Added healthchecks for infrastructure containers and backend services.

Verification:

- `docker compose config --quiet` passed on 2026-05-02.
- `mvn -T1 clean verify` passed on 2026-05-02.

Committed as `chore: add local infrastructure with docker compose`.

## Phase 3 - Auth service

- Implemented register, login, refresh token rotation, logout/revoke, access-token blacklist, and `/auth/me`.
- Added BCrypt password hashing, JWT access tokens, secure random refresh tokens stored as SHA-256 hashes, and role rules that prevent public admin self-registration.
- Added `user_accounts` and `refresh_tokens` Flyway migrations with demo accounts:
  - `admin@devhire.local` / `Admin@123456`
  - `employer@devhire.local` / `Employer@123456`
  - `candidate@devhire.local` / `Candidate@123456`
- Added shared global exception handling and servlet correlation id filter in `common-lib`.
- Added auth service unit/controller tests for successful registration, validation failure, admin self-registration rejection, and invalid login handling.
- Upgraded JaCoCo from 0.8.12 to 0.8.14 because local verification runs on JDK 26 while compiling Java 21 bytecode.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with 5 auth tests.

Committed as `feat(auth): implement jwt authentication and refresh token flow`.

## Phase 4 - User service

- Implemented candidate/employer profile APIs:
  - `GET /users/me`
  - `PUT /users/me`
  - `GET /users/{id}`
- Added gateway identity header handling through shared `X-User-Id`, `X-User-Email`, and `X-User-Role` constants.
- Added profile entity, repository, service layer, mapper, request/response DTOs, validation, optimistic locking, and Flyway migrations.
- Seeded demo employer profile, demo candidate profile, and four additional candidate profiles.
- Added tests for profile update, validation failure, candidate skill normalization, and admin profile update rejection.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with 9 total tests.

Committed as `feat(user): implement profile management APIs`.

## Phase 5 - Company service

- Implemented employer company creation, company list/detail, admin approve/reject workflow, and internal company lookup for later job-service checks.
- Added company entity, status enum, DTOs, mapper, repository, service layer, event publisher, validation, unique slug handling, and role checks from gateway identity headers.
- Added Flyway migrations with slug uniqueness, status indexes, employer index, and 3 seeded companies.
- Published audit and company-reviewed events to Kafka topics with failure-tolerant logging.
- Added service/controller tests for create, validation, role rejection, and admin approval.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with 14 total tests.

Committed as `feat(company): implement company onboarding and approval workflow`.

## Phase 6 - Job service

- Implemented job posting APIs for employer create/update/submit-review/close, admin approve/reject, public job detail, and public search.
- Added approved-company ownership checks through OpenFeign against company-service internal API.
- Added `PostgresJobSearchAdapter` with pageable filtering by keyword, skill, location, salary range, and level; schema includes a PostgreSQL full-text GIN index for future search optimization.
- Added job entity, workflow status enum, DTOs, mapper, repository/specification search, event publisher, and Flyway migrations.
- Seeded 10 jobs across approved companies, including 8 published jobs plus draft/review examples.
- Added service/controller tests for create, validation, unapproved company rejection, and admin approval.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with 19 total tests.

Committed as `feat(job): implement job posting and search APIs`.

## Phase 7 - Application service

- Implemented candidate application workflow:
  - `POST /jobs/{jobId}/applications`
  - `GET /applications/me`
  - `GET /employer/jobs/{jobId}/applications`
  - `PATCH /applications/{id}/status`
  - `PATCH /applications/{id}/withdraw`
- Added transactional duplicate-prevention through a real unique constraint on `(candidate_id, job_id)`.
- Added application status history for every submit, employer status change, and withdrawal.
- Added OpenFeign job lookup through job-service internal API, so application-service validates published jobs and employer ownership without reading another service database.
- Published application-submitted, application-status-changed, and audit events to Kafka topics with failure-tolerant logging.
- Added Flyway migrations with application/history tables, indexes, and demo application data.
- Added application service unit/controller tests for successful submit, duplicate rejection, unpublished job rejection, employer status update, and candidate withdrawal.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with 24 total tests.

Committed as `feat(application): implement candidate application workflow`.

## Phase 8 - Notification service + events

- Implemented internal notification storage and APIs:
  - `GET /notifications`
  - `PATCH /notifications/{id}/read`
  - `PATCH /notifications/read-all`
- Added notification entity, repository, mapper, service layer, optimistic locking, recipient unread index, and Flyway migrations.
- Added Kafka listener for application events:
  - `ApplicationSubmittedEvent` creates employer notifications.
  - `ApplicationStatusChangedEvent` creates candidate notifications.
- Added notification-created event publishing for downstream audit/analytics usage.
- Seeded demo notifications for employer and candidate demo users.
- Added service/controller tests for event-created notifications and read/unread flows.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with 30 total tests.

Committed as `feat(notification): add event-driven notifications`.

## Phase 9 - Audit service

- Implemented audit-service Kafka ingestion from `audit.events` with idempotency through unique `event_id`.
- Added audit log persistence with actor, role, action, resource, occurred time, created time, and JSONB metadata.
- Added admin-only audit log API:
  - `GET /admin/audit-logs`
- Added filters by `actorId`, `action`, `from`, and `to`, with pagination and sorting support from Spring Data.
- Added Flyway migrations with indexes for actor/action/date and a GIN index for metadata.
- Seeded representative audit logs for register, create company, approve job, and submit application.
- Added service/controller tests for event recording, duplicate event skip, RBAC rejection, and admin filtering.

Verification:

- `mvn -T1 clean verify` initially failed because the standalone controller test lacked Spring Data's `Pageable` argument resolver.
- Added `PageableHandlerMethodArgumentResolver` to the audit controller test and reran verification.
- `mvn -T1 clean verify` passed on 2026-05-02 with 35 total tests.

Committed as `feat(audit): record and expose administrative audit logs`.

## Phase 10 - Gateway integration

- Implemented Spring Cloud Gateway programmatic routes for all external `/api/...` endpoint groups.
- Added `/api` path rewrite so downstream services keep clean internal paths.
- Added JWT validation at the gateway using the same signing secret as auth-service.
- Added Redis-backed access-token blacklist checks for logout/revoked tokens.
- Injected trusted identity headers for downstream services:
  - `X-User-Id`
  - `X-User-Email`
  - `X-User-Role`
- Stripped spoofed identity headers from public auth routes.
- Added Redis rate limiting, CORS config, correlation-id propagation, and JSON gateway error responses.
- Added gateway tests for valid JWT header injection, missing-token rejection, and spoofed header stripping.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with 38 total tests.
- `docker compose config --quiet` passed on 2026-05-02.

Committed as `feat(gateway): wire service routing and security filters`.

## Phase 11 - Observability

- Added Micrometer OpenTelemetry tracing bridge and OTLP exporter dependencies to all runtime services.
- Configured Prometheus application tags, trace sampling, OTLP trace export endpoint, and trace/span ids in log patterns for all services.
- Kept health/readiness probes and Prometheus actuator exposure enabled consistently across services.
- Upgraded Grafana provisioning dashboard with:
  - HTTP requests per second by service.
  - HTTP p95 latency by service.
  - 5xx error ratio by service.
  - JVM heap usage by service.
- Verified OTel Collector, Tempo, Prometheus, and Grafana compose configuration remains valid.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with 38 total tests.
- `docker compose config --quiet` passed on 2026-05-02.

Committed as `feat(observability): add metrics tracing health checks and dashboards`.

## Phase 12 - Testing hardening

- Enabled Maven Failsafe in the parent build so `*IT` integration tests run as part of `mvn verify`.
- Added common event contract tests to protect JSON compatibility for shared event DTOs.
- Added direct Jackson test dependencies to `common-lib` so event contract tests are explicit and module-local.
- Added `JobRepositoryIT` with Testcontainers PostgreSQL:
  - Verifies Flyway migrations and seed data run against real PostgreSQL.
  - Verifies job workflow state is persisted by JPA.
  - Verifies the database salary-range check constraint rejects invalid data.
- Kept existing unit/controller coverage across auth, user, company, job, application, notification, audit, and gateway.

Verification:

- `mvn -T1 clean verify` initially failed because `common-lib` contract tests needed explicit Jackson databind/jsr310 test dependencies.
- Added the missing test dependencies and reran verification.
- `mvn -T1 clean verify` passed on 2026-05-02 with 42 total tests, including 2 Testcontainers PostgreSQL integration tests.

Committed as `test: add unit integration and controller coverage`.

## Phase 13 - CI/CD

- Added `.github/workflows/ci.yml`:
  - Runs on push and pull request.
  - Sets up Java 21 with Maven cache.
  - Runs `mvn -B -T1 clean verify`.
  - Uploads Surefire/Failsafe reports on failure.
- Added `.github/workflows/docker.yml`:
  - Builds Docker images for each runtime service with a matrix.
  - Tags images by commit SHA.
- Added `.github/workflows/security.yml`:
  - Runs GitHub dependency review on pull requests.
  - Runs Maven dependency tree resolution as a lightweight dependency sanity check.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with 42 total tests.

Committed as `ci: add build test docker and security workflows`.

## Phase 14 - Documentation

- Added root Vietnamese `README.md` with architecture, tech stack, service map, workflow, local/Docker/test instructions, Swagger links, demo accounts, endpoints, sample responses, observability, CI/CD, directory structure, production-ready highlights, and roadmap.
- Added English documentation in `docs/README_EN.md`.
- Added Japanese documentation in `docs/README_JA.md`.
- Expanded `docs/architecture.md` with service boundaries, data ownership, communication, security, and observability notes.
- Added `docs/api.http` covering the main end-to-end API flow through gateway.
- Configured Git remote `origin` to `https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices.git`.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with 42 total tests.

Committed as `docs: add production portfolio documentation`.

## Phase 15 - Final hardening

- Added `.gitattributes` for consistent text normalization and shell script handling.
- Expanded `.env.example` with Redis, Kafka, service URL, CORS, rate-limit, and tracing variables.
- Reworked `deploy/docker-compose.prod.yml` into a production-style sample for all backend services.
- Added Windows helper scripts:
  - `scripts/verify.ps1`
  - `scripts/dev-up.ps1`
  - `scripts/compose-config.ps1`
- Updated the Vietnamese README with the helper script workflow.
- Replaced the unavailable `bitnami/kafka:3.9` image with `apache/kafka:3.9.0` and updated KRaft environment variables.
- Hardened all service Dockerfiles so Maven sees every reactor module `pom.xml` during Docker builds.
- Made all Docker host ports configurable through `*_HOST_PORT` variables; Redis defaults to host port `6380` to avoid the common local Redis collision.
- Fixed Docker service datasource wiring by setting `POSTGRES_HOST=postgres` and `POSTGRES_PORT=5432` inside the service network.
- Added the missing auth-service actuator dependency so `/actuator/health/readiness` is available.
- Wired gateway Docker environment to internal service URLs (`http://auth-service:8081`, etc.) instead of localhost defaults.
- Added unexpected-exception logging in the shared global exception handler to make production diagnostics less opaque.
- Reconfirmed Git remote `origin` points to `https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices.git`.

Verification:

- `docker compose config --quiet` passed with default ports and with the alternate host-port set used on this machine.
- Initial `docker compose up --build -d` found real local hardening issues:
  - unavailable Kafka image tag,
  - incomplete Dockerfile Maven reactor context,
  - local host port collisions with other running projects,
  - service datasource fallback to `localhost:5432`,
  - missing auth actuator dependency,
  - gateway service URL fallback to localhost.
- Fixed those issues and reran Docker verification successfully using alternate host ports because this machine already had other stacks on `8080`, `3000`, `3100`, `4318`, `6379`, and `9090`.
- `docker compose up --build -d --force-recreate` passed on 2026-05-02 with the alternate host-port set:
  - Gateway: `http://localhost:18080`
  - Services: `18081-18087`
  - Prometheus: `19090`
  - Grafana: `13000`
- Readiness probes returned `UP` for gateway, auth, user, company, job, application, notification, and audit services.
- End-to-end API smoke flow through gateway passed:
  - demo admin/employer/candidate login,
  - candidate `/api/auth/me`,
  - employer created company,
  - admin approved company,
  - employer created/submitted job,
  - admin approved job,
  - candidate searched jobs and applied,
  - employer moved application to `INTERVIEW`,
  - candidate notification list returned data,
  - admin audit log list returned data.
- `mvn -T1 clean verify` passed on 2026-05-02 at 22:19 +07 with 42 total tests, including Testcontainers PostgreSQL integration tests.
- Secret/TODO scan found only local placeholder variables in `.env.example` and this progress note; no real secret was found in source files.

Committed as `chore: polish configuration validation and developer experience`.

## Phase 16 - Kubernetes deployment and release hardening

- Added `deploy/k8s` Kubernetes baseline:
  - namespace,
  - shared config map,
  - placeholder-only secret template,
  - deployments and services for gateway and all backend services,
  - ingress sample,
  - HPA samples for gateway, auth, and job services.
- Added `docs/deployment.md` as an operational runbook for Kubernetes rendering, deployment, image updates, health checks, and rollback.
- Added `.github/workflows/release.yml` to publish versioned service images to GHCR on semantic version tags or manual dispatch.
- Updated Vietnamese, English, and Japanese documentation to mention Kubernetes and release operations.

Verification:

- `kubectl kustomize .\deploy\k8s` passed on 2026-05-02.
- `docker compose config --quiet` passed on 2026-05-02.
- `mvn -T1 clean verify` passed on 2026-05-02 with 42 total tests.
- `kubectl apply --dry-run=client --validate=false -k .\deploy\k8s` could not complete because no local Kubernetes API server is running at the current kubeconfig endpoint. This was not counted as passed; Kustomize rendering is the verified local check for this environment.

## Phase 17 - OpenSearch job search

- Added OpenSearch search adapter for `job-service` behind the existing `JobSearchAdapter` interface.
- Added OpenSearch indexing abstraction:
  - `JobSearchIndex`,
  - OpenSearch index writer,
  - no-op fallback implementation,
  - index bootstrap runner.
- Kept PostgreSQL search as fallback/degraded mode instead of deleting it.
- Wired job lifecycle actions to sync/remove OpenSearch documents when jobs become published or leave the public search surface.
- Added OpenSearch and OpenSearch Dashboards to Docker Compose.
- Added production/Kubernetes configuration variables for OpenSearch.
- Added unit coverage for OpenSearch search ordering, fallback behavior, and index publishing.
- Updated Vietnamese, English, Japanese, and architecture docs.

Verification:

- `mvn -pl job-service -am test` passed on 2026-05-02 with 10 tests across `common-lib` and `job-service`.
- `docker compose config --quiet` passed on 2026-05-02.

Committed as `feat(job): add opensearch search adapter`.

## Phase 18 - SMTP email notification delivery

- Added SMTP-capable email delivery for `notification-service` using Spring Mail.
- Added an email provider abstraction:
  - `EmailDeliveryService`,
  - `SmtpEmailDeliveryService`,
  - `NoopEmailDeliveryService`,
  - `EmailNotificationDispatcher`.
- Added `UserClient` Feign integration so notification-service can resolve recipient email addresses from user-service without reading another service database.
- Added persisted email delivery status fields:
  - `email_status`,
  - `email_recipient`,
  - `email_provider_message_id`,
  - `email_failure_reason`,
  - `email_sent_at`.
- Added Flyway migration `V3__email_delivery.sql`.
- Added Docker Compose, production Compose, and Kubernetes configuration for SMTP settings and secrets.
- Updated Vietnamese, English, Japanese, architecture, and deployment docs.
- Added unit coverage for disabled delivery, successful SMTP handoff, and provider failure handling.

Verification:

- `mvn -pl notification-service -am test` passed on 2026-05-02 with 11 tests across `common-lib` and `notification-service`.
- `docker compose config --quiet` passed on 2026-05-02.
- `kubectl kustomize .\deploy\k8s` passed on 2026-05-02.

Committed as `feat(notification): add smtp email delivery`.

## Phase 19 - Coverage gate

- Added JaCoCo `check` goal to Maven `verify` with a hard baseline instruction coverage threshold.
- Added `scripts/check-coverage.ps1` with per-module coverage gates based on the current tested baseline.
- Updated CI to run the coverage gate after `mvn clean verify`.
- Updated `scripts/verify.ps1` so local verification runs the same gate.
- CI now uploads JaCoCo reports on failure for easier debugging.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-02 with Maven JaCoCo check enabled.
- `powershell -ExecutionPolicy Bypass -File .\scripts\check-coverage.ps1` passed on 2026-05-02:
  - api-gateway: 37.6% / 35.0%
  - application-service: 62.5% / 60.0%
  - audit-service: 56.5% / 55.0%
  - auth-service: 29.4% / 28.0%
  - common-lib: 10.9% / 10.0%
  - company-service: 58.6% / 55.0%
  - job-service: 49.8% / 45.0%
  - notification-service: 60.3% / 45.0%
  - user-service: 76.0% / 70.0%

Committed as `ci: enforce coverage gates`.

## Phase 20 - Kubernetes hardening

- Added Kubernetes service account with token automount disabled.
- Added namespace Pod Security labels.
- Added pod-level `seccompProfile: RuntimeDefault` and service account binding for all service deployments.
- Added PodDisruptionBudgets for gateway and all backend services.
- Added namespace network policy with same-namespace ingress and ingress-controller access to gateway.
- Added resource quota and limit range.
- Added `deploy/k8s-overlays/local` and `deploy/k8s-overlays/prod` Kustomize overlays.
- Updated Vietnamese deployment docs and runbook.

Verification:

- `kubectl kustomize .\deploy\k8s` passed on 2026-05-02.
- `kubectl kustomize .\deploy\k8s-overlays\local` passed on 2026-05-02.
- `kubectl kustomize .\deploy\k8s-overlays\prod` passed on 2026-05-02.
- `docker compose config --quiet` passed on 2026-05-02.

Committed as `chore(k8s): harden deployment manifests`.

## Phase 21 - Next.js frontend

- Added `frontend/` Next.js 16, React 19, TypeScript application.
- Implemented pages:
  - `/login`,
  - `/register`,
  - `/jobs`,
  - `/jobs/[id]`,
  - `/candidate`,
  - `/employer`,
  - `/admin`.
- Added frontend API client wired to API Gateway via `NEXT_PUBLIC_API_BASE_URL`.
- Added local token session handling for access token and current user role.
- Added operational UI for:
  - job search and application submission,
  - candidate applications and notifications,
  - employer company/job workflow and applicant status update,
  - admin company approval, job approval by ID, and audit log view.
- Added frontend Dockerfile with Next standalone output and non-root runtime user.
- Added frontend service to Docker Compose and production Compose.
- Added frontend deployment/service/HPA/PDB/Ingress route to Kubernetes manifests.
- Updated CI and Docker/release workflows to build the frontend.
- Added frontend docs to Vietnamese, English, Japanese, and deployment runbook.

Verification:

- `npm install` initially found a missing `@types/react-dom@19.2.7`; fixed to the current published `19.2.3`.
- `npm audit --omit=dev` initially found a transitive PostCSS advisory from Next.js; added a `postcss@8.5.10` override and reran audit successfully.
- `npm run typecheck` passed on 2026-05-02.
- `npm run build` passed on 2026-05-02.
- `npm audit --omit=dev` passed on 2026-05-02 with 0 vulnerabilities.
- `docker build -f frontend/Dockerfile -t devhire/frontend:test .` passed on 2026-05-02.
- `docker compose config --quiet` passed on 2026-05-02.
- `kubectl kustomize .\deploy\k8s`, `.\deploy\k8s-overlays\local`, and `.\deploy\k8s-overlays\prod` passed on 2026-05-02.

Committed as `feat(frontend): add nextjs recruitment console`.

## Phase 22 - Runtime hardening after upgrade verification

- Fixed OpenSearch 2.18 local startup by disabling the security plugin for local Compose and documenting `OPENSEARCH_INITIAL_ADMIN_PASSWORD` in `.env.example`.
- Added cold-start OpenSearch reindexing for all `PUBLISHED` jobs so seeded and existing public jobs are searchable after service restart.
- Serialized OpenSearch date fields as ISO-8601 strings to match the index date mapping.
- Fixed notification email delivery bean selection so noop mode is available when SMTP delivery is disabled.
- Disabled the mail health indicator automatically when email delivery is disabled, while keeping it available for real SMTP mode.
- Fixed Tempo local volume permissions in Docker Compose.

Verification:

- `mvn -pl job-service -am test` passed on 2026-05-03.
- `mvn -pl notification-service -am test` passed on 2026-05-03.
- `mvn -T1 clean verify` passed on 2026-05-03 after stopping the local Compose stack to avoid Docker resource contention.
- `powershell -ExecutionPolicy Bypass -File .\scripts\check-coverage.ps1` passed on 2026-05-03:
  - api-gateway: 37.6% / 35.0%
  - application-service: 62.5% / 60.0%
  - audit-service: 56.5% / 55.0%
  - auth-service: 29.4% / 28.0%
  - common-lib: 10.9% / 10.0%
  - company-service: 58.6% / 55.0%
  - job-service: 51.8% / 45.0%
  - notification-service: 60.3% / 45.0%
  - user-service: 76.0% / 70.0%
- `docker compose config --quiet` passed on 2026-05-03.
- `docker compose up --build -d` passed on 2026-05-03 using alternate host ports for this workstation:
  - gateway `18080`,
  - frontend `13001`,
  - OpenSearch `19200`,
  - OpenSearch Dashboards `15601`,
  - Grafana `13000`.
- `docker compose ps` showed all backend services healthy and all infrastructure containers running on 2026-05-03.
- Gateway smoke test passed:
  - `POST /api/auth/login` with `candidate@devhire.local`,
  - `GET /api/jobs?size=5&sort=createdAt,desc` with JWT returned `total=9`.
- OpenSearch smoke test passed: `GET /devhire_jobs/_count` returned `count=9`.
- Frontend smoke test passed: `GET /jobs` returned HTTP 200.

Committed as `chore: harden opensearch and notification runtime`.

## Phase 23 - Gmail SMTP sender hardening

- Added a Gmail SMTP profile template in `.env.gmail.example` without real credentials.
- Added local-only scripts:
  - `scripts/configure-gmail-smtp.ps1` to write Gmail SMTP settings into the gitignored `.env` file.
  - `scripts/smoke-gmail-smtp.ps1` to send an independent SMTP smoke email without printing the app password.
- Added Spring Mail Gmail hardening variables:
  - `SPRING_MAIL_SMTP_STARTTLS_REQUIRED`
  - `SPRING_MAIL_SMTP_SSL_TRUST`
  - `SPRING_MAIL_SMTP_CONNECTION_TIMEOUT`
  - `SPRING_MAIL_SMTP_TIMEOUT`
  - `SPRING_MAIL_SMTP_WRITE_TIMEOUT`
  - `MANAGEMENT_HEALTH_MAIL_ENABLED`
- Propagated the new SMTP settings into Docker Compose, production Compose, and Kubernetes ConfigMap templates.
- Added unit coverage for `SmtpEmailDeliveryService` success and provider failure cases.
- Added `docs/gmail-smtp.md` with Vietnamese, English, and Japanese instructions.

Verification:

- `mvn -pl notification-service -am test` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `kubectl kustomize .\deploy\k8s`, `.\deploy\k8s-overlays\local`, and `.\deploy\k8s-overlays\prod` passed on 2026-05-03.
- `scripts/configure-gmail-smtp.ps1` created a local gitignored `.env` with Gmail SMTP enabled.
- `scripts/smoke-gmail-smtp.ps1` sent a real smoke email through Gmail SMTP on 2026-05-03.
- `docker compose up --build -d notification-service` rebuilt and started `notification-service` with Gmail SMTP env; readiness was `UP`.
- `mvn -T1 clean verify` passed on 2026-05-03.
- `powershell -ExecutionPolicy Bypass -File .\scripts\check-coverage.ps1` passed on 2026-05-03; `notification-service` coverage increased to 67.5% against the 45.0% gate.

Committed as `chore(notification): configure gmail smtp sender`.

## Phase 24 - Browser E2E and portfolio screenshots

- Added Playwright E2E smoke coverage for the production happy path through the real frontend and API Gateway:
  - public job search and job detail,
  - candidate dashboard login,
  - employer dashboard login,
  - admin dashboard login.
- Added `scripts/e2e-smoke.ps1` to run/wait the Docker stack, verify Gateway readiness, execute E2E tests, and regenerate portfolio screenshots.
- Added a manual/scheduled GitHub Actions E2E workflow so heavy browser QA does not slow every pull request.
- Added stable `data-testid` hooks to frontend pages used by E2E tests and portfolio screenshot capture.
- Fixed Gateway public-read security for `GET /api/jobs` and `GET /api/jobs/{id}` while preserving JWT requirements for write/admin routes.
- Propagated `CORS_ALLOWED_ORIGINS` into the Gateway Docker Compose environment and fixed frontend build-time API base URL injection.
- Generated real portfolio screenshots in `docs/screenshots/`:
  - `jobs-page.png`,
  - `job-detail.png`,
  - `candidate-dashboard.png`,
  - `employer-dashboard.png`,
  - `admin-dashboard.png`.
- Browser plugin was used to verify the local UI route; screenshot capture through the in-app browser CDP surface timed out, so reproducible Playwright screenshot capture was added as the stable portfolio artifact path.

Verification:

- `npm run typecheck` passed on 2026-05-03.
- `npm run build` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `.\scripts\e2e-smoke.ps1 -Build -KeepRunning` passed on 2026-05-03 after fixing Gateway CORS/public job read behavior:
  - Playwright E2E: 4/4 passed.
- `.\scripts\e2e-smoke.ps1 -SkipCompose -KeepRunning` passed on 2026-05-03:
  - Playwright E2E: 4/4 passed.
  - Screenshot capture: 1/1 passed.
- `mvn -T1 clean verify` passed on 2026-05-03.

Committed as `test(e2e): add browser driven smoke coverage`.

## Phase 25 - Event reliability with transactional outbox

- Added reusable transactional outbox infrastructure in `common-lib`:
  - `outbox_events` writer/repository,
  - scheduled Kafka publisher with retry/backoff,
  - terminal `DEAD_LETTER` status after max attempts,
  - `processed_events` repository for idempotent consumers.
- Replaced direct Kafka publishing in auth, company, job, application, and notification services with same-transaction outbox writes.
- Added Flyway migrations for `outbox_events` in producing services and `processed_events` in audit/notification consumers.
- Added consumer idempotency for notification and audit event listeners using `eventId`.
- Fixed runtime Kafka payload handling after smoke testing revealed Spring was passing `ConsumerRecord` wrappers to listeners in the current converter setup.
- Hardened idempotency cleanup so a consumer removes its processed marker when downstream handling fails, allowing Kafka retry instead of dropping the event permanently.
- Added unit coverage for:
  - outbox serialization/publishing success,
  - outbox publish failure and retry marking,
  - duplicate consumer skips,
  - `ConsumerRecord` unwrapping,
  - processed-marker cleanup on consumer failure.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `docker compose up -d --build audit-service notification-service` rebuilt and started both consumers successfully on 2026-05-03.
- Runtime outbox smoke passed on 2026-05-03:
  - `POST /api/auth/login` through Gateway generated a new auth audit event.
  - `devhire_auth.outbox_events` showed `PUBLISHED = 7`.
  - `devhire_audit.processed_events` showed `processed_events = 1`.
  - `devhire_audit.audit_logs` contained the new `login` entry for `candidate@devhire.local`.

Committed as `feat(events): add transactional outbox publishing`.

## Phase 26 - Notification delivery hardening

- Moved SMTP delivery out of the notification creation transaction and into a database-backed delivery queue.
- Added email lifecycle states:
  - `PENDING`,
  - `SENDING`,
  - `SENT`,
  - `FAILED_RETRYABLE`,
  - `FAILED_PERMANENT`,
  - `DISABLED`.
- Added Flyway `V6__email_delivery_retry.sql` with retry columns:
  - `email_attempts`,
  - `email_next_attempt_at`,
  - `email_last_attempt_at`.
- Added scheduled `EmailDeliveryWorker` with `FOR UPDATE SKIP LOCKED` queue polling.
- Added exponential backoff and max-attempt retry policy.
- Added local in-memory rate limiting for SMTP send throughput.
- Added production-style HTML email templates with plain-text fallback.
- Kept internal notification persistence as the fallback source of truth when SMTP is disabled or fails.
- Extended environment, Docker Compose, production Compose, and Kubernetes ConfigMap templates with email retry/rate-limit settings.
- Updated Gmail/deployment docs without committing any real SMTP credential.
- Added focused tests for:
  - retry policy,
  - queue worker rate-limit behavior,
  - dispatcher success/retryable failure behavior,
  - HTML template escaping,
  - SMTP retryable failure classification.

Verification:

- `mvn -T1 -pl notification-service -am test` passed on 2026-05-03.
- Docker smoke found and fixed two runtime-only Spring binding issues:
  - `EmailProperties` record constructor binding,
  - `EmailRateLimiter` constructor selection.
- `docker compose up -d --build notification-service` passed on 2026-05-03 with `DEVHIRE_NOTIFICATION_EMAIL_ENABLED=false` to avoid sending real email during automated smoke.
- Runtime DB smoke passed on 2026-05-03:
  - Flyway applied notification migration v6.
  - `notifications` table contained `email_attempts`, `email_next_attempt_at`, and `email_last_attempt_at`.
  - email worker moved pending seed notifications to `DISABLED` while preserving internal notifications.
- `mvn -T1 clean verify` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `kubectl kustomize .\deploy\k8s`, `.\deploy\k8s-overlays\local`, and `.\deploy\k8s-overlays\prod` passed on 2026-05-03.

Committed as `feat(notification): harden email retry delivery`.

## Phase 27 - Security and supply chain

- Hardened `.github/workflows/security.yml` with:
  - Gitleaks secret scanning,
  - Trivy filesystem vulnerability scanning,
  - CycloneDX SBOM artifact generation through Anchore/Syft,
  - scheduled/manual Trivy Docker image scanning for every backend service and frontend image,
  - report artifact upload for filesystem, image scan, and SBOM outputs.
- Added `.gitleaks.toml` with explicit allowlist entries for documented placeholders and deterministic demo credentials only.
- Added OCI image labels to Docker build and release workflows:
  - title,
  - description,
  - source,
  - revision,
  - version on release,
  - license.
- Added trilingual `docs/security.md` covering:
  - threat model,
  - secret policy,
  - token policy,
  - CI supply-chain gates.

Verification:

- `docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:latest -color` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo zricethezav/gitleaks:latest detect --source /repo --config /repo/.gitleaks.toml --redact --no-banner --log-level warn` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" aquasec/trivy:0.58.2 fs --scanners vuln,misconfig --severity CRITICAL --ignore-unfixed --exit-code 0 --skip-dirs /repo/.git --skip-dirs /repo/frontend/node_modules /repo` completed on 2026-05-03; Trivy reported upstream Rego policy warnings for misconfig checks, so the CI workflow is scoped to `scanners: vuln` for stable gating.
- `mvn -B -DskipTests dependency:tree` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `kubectl kustomize .\deploy\k8s`, `.\deploy\k8s-overlays\local`, and `.\deploy\k8s-overlays\prod` passed on 2026-05-03.

Committed as `ci(security): add trivy gitleaks and sbom workflows`.

## Phase 28 - Helm chart and GitOps deployment

- Added `deploy/helm/devhire-cloud` Helm chart with:
  - namespace,
  - service account,
  - ConfigMap,
  - example Secret support for non-production,
  - Deployments and Services for frontend plus all backend services,
  - readiness/liveness probes,
  - resource requests/limits,
  - HPA templates,
  - PodDisruptionBudget templates,
  - NetworkPolicy,
  - ResourceQuota,
  - Ingress routes for frontend and API Gateway.
- Added environment values:
  - `values-local.yaml`,
  - `values-staging.yaml`,
  - `values-prod.yaml`.
- Added Argo CD sample at `deploy/gitops/argocd-application.yaml`.
- Updated deployment docs with Helm render/install and GitOps instructions.
- Kept raw Kubernetes manifests as the transparent baseline while Helm becomes the configurable deployment path.

Verification:

- Native `helm` is not installed on this workstation, so Helm validation was executed through `alpine/helm:3.17.0`.
- `helm lint deploy/helm/devhire-cloud` passed on 2026-05-03.
- `helm template` passed for local, staging, and production values on 2026-05-03.
- `kubectl apply --dry-run=client` could not be used because the local kubeconfig points to an inactive API server at `https://127.0.0.1:56085`.
- Offline manifest validation with `ghcr.io/yannh/kubeconform:latest -strict -ignore-missing-schemas` passed for local, staging, and production Helm renders on 2026-05-03.

Committed as `chore(deploy): add helm and gitops manifests`.

## Phase 29 - Final portfolio polish

- Added portfolio screenshots to the Vietnamese, English, and Japanese documentation:
  - jobs page,
  - job detail,
  - candidate dashboard,
  - employer dashboard,
  - admin dashboard.
- Added architecture decision records under `docs/ADR` for:
  - microservices and service-owned databases,
  - transactional outbox,
  - OpenSearch job search,
  - JWT and refresh-token security,
  - Gmail SMTP notification delivery.
- Added `docs/demo-script.md` with a 10-minute recruiter-friendly demo flow.
- Added `docs/production-checklist.md` for portfolio review and operational readiness.
- Updated `README.md`, `docs/README_EN.md`, and `docs/README_JA.md` with:
  - screenshot gallery,
  - production-ready highlights,
  - security and deployment links,
  - Helm/GitOps notes,
  - outbox and email delivery notes.
- Updated `docs/architecture.md` with event reliability, search, notification delivery, and deployment details.

Verification:

- Screenshot artifacts checked on 2026-05-03: 5 non-empty PNG files exist in `docs/screenshots`.
- `mvn -T1 clean verify` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `kubectl kustomize .\deploy\k8s`, `.\deploy\k8s-overlays\local`, and `.\deploy\k8s-overlays\prod` passed on 2026-05-03.
- `helm lint deploy/helm/devhire-cloud` passed through `alpine/helm:3.17.0` on 2026-05-03.
- `helm template` passed for local, staging, and production values through `alpine/helm:3.17.0` on 2026-05-03.

Committed as `docs: add portfolio screenshots adr and demo guide`.

## Final verification - Phase 24 to Phase 29

- `mvn -T1 clean verify` passed on 2026-05-03 after all Phase 24-29 commits.
- `docker compose config --quiet` passed on 2026-05-03.
- `kubectl kustomize .\deploy\k8s`, `.\deploy\k8s-overlays\local`, and `.\deploy\k8s-overlays\prod` passed on 2026-05-03.
- `helm lint deploy/helm/devhire-cloud` passed through `alpine/helm:3.17.0` on 2026-05-03.
- `helm template` passed for local, staging, and production values through `alpine/helm:3.17.0` on 2026-05-03.
- `.\scripts\e2e-smoke.ps1 -Build -KeepRunning` passed on 2026-05-03:
  - built the Docker stack,
  - waited for Gateway and service readiness endpoints,
  - verified Gateway job search smoke through CORS,
  - ran Playwright E2E with 4/4 tests passing,
  - regenerated portfolio screenshots with 1/1 screenshot test passing.
- Manual API smoke through Gateway `http://localhost:18080` passed on 2026-05-03:
  - admin, employer, and candidate login,
  - employer created a company,
  - admin approved the company,
  - employer created and submitted a job,
  - admin approved the job,
  - candidate searched the published job,
  - candidate submitted an application,
  - employer changed the application status to `INTERVIEW`,
  - candidate notification lookup returned the application signal,
  - admin audit log lookup returned login activity.

## Phase 30 - Gateway API smoke automation

- Added `scripts/api-smoke.ps1` so the end-to-end business API flow can be rerun without copying requests from `docs/api.http`.
- The script validates through API Gateway:
  - admin, employer, and candidate login,
  - employer company creation,
  - admin company approval,
  - employer job creation and review submission,
  - admin job approval,
  - candidate job search,
  - candidate application submission,
  - employer application status update,
  - candidate notification lookup,
  - admin audit log lookup.
- The script can either target an already-running Gateway or start the full Docker stack itself with high local ports.
- Added `.github/workflows/api-smoke.yml` as a manual/scheduled workflow that builds the Docker stack and runs the same Gateway smoke flow.
- Updated README files with the API smoke command.

Verification:

- `scripts/api-smoke.ps1 -GatewayUrl http://localhost:18080` passed locally against the running Docker stack on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.

Committed as `test(api): add gateway smoke flow automation`.

## Phase 31 - Gateway performance smoke

- Added `perf/k6/job-search-smoke.js` with k6 thresholds for:
  - successful checks,
  - HTTP failure rate,
  - p95 request latency.
- The k6 smoke test exercises public job search and job detail through API Gateway.
- Added `scripts/perf-smoke.ps1` so the test can run with either a local `k6` binary or the Docker image `grafana/k6:0.56.0`.
- Added `.github/workflows/performance.yml` as a manual/scheduled workflow that:
  - starts the Docker stack,
  - validates the business API flow through `api-smoke.ps1`,
  - runs the k6 Gateway smoke,
  - uploads the JSON k6 summary artifact.
- Added `reports/` to `.gitignore` for local k6 summaries.
- Updated README files with the performance smoke command.

Verification:

- `scripts/perf-smoke.ps1 -BaseUrl http://localhost:18080 -Vus 2 -Duration 10s -UseDocker` passed locally against the running Docker stack on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.

Committed as `test(perf): add k6 gateway performance smoke`.

## Phase 32 - Dependency maintenance automation

- Added `.github/dependabot.yml` for scheduled maintenance pull requests covering:
  - Maven dependencies,
  - frontend npm dependencies,
  - GitHub Actions,
  - backend Docker base images,
  - frontend Docker base image.
- Grouped updates by platform/tooling to keep maintenance PRs reviewable.
- Updated documentation to mention Dependabot as part of the supply-chain maintenance strategy.

Verification:

- `docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:latest -color` passed on 2026-05-03.
- `mvn -T1 clean verify` passed on 2026-05-03.

## Phase 33 - AWS Terraform blueprint

- Added a safe AWS Terraform blueprint under `deploy/terraform/aws`.
- Created reusable modules for:
  - VPC networking, public/private subnets, route tables, NAT toggle, and service/data security groups,
  - EKS cluster, managed node group, and OIDC/IRSA foundation,
  - RDS PostgreSQL, ElastiCache Redis, MSK Serverless Kafka, and OpenSearch with explicit enable toggles,
  - ECR repositories for backend services and frontend,
  - AWS Secrets Manager secret-name/ARN placeholders without secret values.
- Added `dev`, `staging`, and `prod` environment folders with local-safe backend defaults and `terraform.tfvars.example` files.
- Added `backend.s3.example.hcl` for optional S3 + DynamoDB remote state, intentionally not enabled by default.
- Updated `.gitignore` to exclude Terraform state, plan files, local plugin caches, and lock files from the portfolio repository.
- Fixed the Maven test runner to use Mockito as a Java agent so local verification works on newer JDKs while still compiling with `--release 21`.

Verification:

- `docker run --rm -v "${PWD}:/workspace" -w /workspace hashicorp/terraform:1.10.5 fmt -check -recursive deploy/terraform/aws` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace/deploy/terraform/aws/environments/dev hashicorp/terraform:1.10.5 validate` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace/deploy/terraform/aws/environments/staging hashicorp/terraform:1.10.5 validate` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/workspace" -w /workspace/deploy/terraform/aws/environments/prod hashicorp/terraform:1.10.5 validate` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `mvn -T1 clean verify` passed on 2026-05-03.
- Secret scan over changed Terraform/build files found no Gmail app password, SMTP account, AWS key id, or AWS secret key.

Committed as `test: configure mockito javaagent for modern jdks`.
Committed as `chore(terraform): add aws infrastructure blueprint`.

## Phase 34 - Terraform CI, security, and cost guardrails

- Added `scripts/terraform-validate.ps1` so local and CI validation share the same Docker-based logic:
  - Terraform `fmt -check`,
  - `init -backend=false` and `validate` for `dev`, `staging`, and `prod`,
  - TFLint recursive scan,
  - Trivy Terraform config scan with critical findings failing the run.
- Added `.github/workflows/terraform.yml` as a manual and pull-request workflow for the AWS blueprint.
- Extended Dependabot maintenance to track Terraform provider updates in each AWS environment.
- Added `docs/cost-estimate.md` with explicit guardrails for NAT Gateway, EKS, RDS, Redis, MSK, and OpenSearch toggles.
- Added provider/version metadata to Terraform modules so TFLint runs without noisy module warnings.
- Tightened default AWS security group egress from `0.0.0.0/0` to the VPC CIDR so Trivy critical config scan passes.
- Hardened Maven test forks with bounded heap/metaspace/code cache after JDK 24 native memory crashes were observed while the Docker stack was running.

Verification:

- `scripts/terraform-validate.ps1` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:latest -color` passed on 2026-05-03.
- `mvn -T1 clean verify` passed on 2026-05-03 after stopping the local Docker stack to free memory.
- Secret scan over changed Terraform/CI/docs/script files found no Gmail app password, SMTP account, AWS key id, or AWS secret key.

Committed as `ci(terraform): add validation security and dependency maintenance`.

## Phase 35 - Helm/GitOps AWS wiring

- Added `values-aws-staging.yaml` and `values-aws-prod.yaml` for AWS deployment overlays.
- Wired Helm values to Terraform-style placeholders for:
  - ECR image registry/tag,
  - RDS PostgreSQL endpoint via `POSTGRES_HOST`,
  - ElastiCache Redis endpoint,
  - MSK Serverless Kafka bootstrap brokers,
  - OpenSearch endpoint/index,
  - AWS Secrets Manager synced Kubernetes secret name,
  - ALB ingress annotations and ACM certificate placeholders,
  - IRSA role ARN annotation on the workload service account.
- Added optional ServiceAccount annotations and automount control to the Helm chart while keeping local defaults secure.
- Added `deploy/gitops/argocd-aws-application.yaml` with separate staging and production Argo CD Application samples.
- Updated Helm documentation with AWS render commands and secret/endpoint replacement notes.

Verification:

- `docker run --rm -v "${PWD}:/workspace" -w /workspace alpine/helm:3.17.0 lint deploy/helm/devhire-cloud` passed on 2026-05-03.
- `helm template` through Docker passed for `values-aws-staging.yaml` and `values-aws-prod.yaml` on 2026-05-03.
- `kubeconform -summary -ignore-missing-schemas` passed for rendered AWS staging/prod Helm manifests on 2026-05-03.
- `kubeconform -summary -ignore-missing-schemas` parsed the AWS Argo CD Application sample and skipped missing Argo CRD schemas as expected.
- `docker compose config --quiet` passed on 2026-05-03.
- `mvn -T1 clean verify` passed on 2026-05-03.
- Secret scan over changed Helm/GitOps/docs files found no Gmail app password, SMTP account, AWS key id, or AWS secret key.

Committed as `chore(deploy): wire helm gitops values for aws`.

## Phase 36 - Contract compatibility gates

- Added provider-side contract tests for:
  - `company-service` internal endpoint `GET /internal/companies/{id}`,
  - `job-service` internal endpoint `GET /internal/jobs/{id}`.
- Added consumer-side DTO compatibility tests for:
  - `job-service` consuming the company internal company payload,
  - `application-service` consuming the job internal job payload.
- Added JSON contract fixtures under each relevant service test resources.
- Added Spring Cloud Contract Groovy DSL descriptors for the provider contracts so the published contract shape is explicit and reviewable.
- Expanded common event contract tests for:
  - `ApplicationStatusChangedEvent`,
  - `JobApprovedEvent`,
  - `CompanyReviewedEvent`.

Verification:

- `mvn -T1 -pl common-lib,company-service,job-service,application-service test` passed on 2026-05-03.
- `mvn -T1 clean verify` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- Secret scan over changed contract/test/docs files found no Gmail app password, SMTP account, AWS key id, or AWS secret key.

Committed as `test(contract): add service compatibility contract gates`.

## Phase 37 - SLO, error budget, and portfolio operations

- Added Prometheus SLO alert rules for:
  - Gateway 5xx rate,
  - Gateway p95 latency,
  - service scrape availability,
  - JVM heap pressure,
  - job search p95 latency,
  - outbox publish failures.
- Mounted the Prometheus rules directory in Docker Compose and configured Prometheus `rule_files`.
- Added Micrometer counters in the shared outbox publisher:
  - `devhire.outbox.publish.success`,
  - `devhire.outbox.publish.failure`.
- Enabled HTTP server request histograms and SLO buckets across the gateway and backend services so p95 panels and alerts can be calculated from Prometheus buckets.
- Added the provisioned Grafana dashboard `DevHire Cloud SLO Overview`.
- Added operations and portfolio documentation:
  - `docs/slo.md`,
  - `docs/aws-terraform.md`,
  - `docs/ADR/0006-aws-terraform-blueprint.md`.
- Linked the AWS Terraform and SLO runbooks from the Vietnamese, English, and Japanese portfolio documentation.

Verification:

- Grafana dashboard JSON parsed successfully on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `docker run --rm --entrypoint promtool -v "${PWD}/infra/prometheus:/etc/prometheus" prom/prometheus:v3.0.1 check config /etc/prometheus/prometheus.yml` passed on 2026-05-03.
- `mvn -T1 clean verify` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:latest -color` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo zricethezav/gitleaks:latest detect --source /repo --no-git --redact --verbose` passed on 2026-05-03 with no leaks found.
- Full Docker runtime smoke was not rerun after Phase 37 because the local stack had been stopped earlier to free memory for JDK 24 Maven verification. Compose syntax, Prometheus rules, Grafana dashboard JSON, and the full Maven lifecycle were validated.

## Phase 38 - Frontend professional redesign

- Used Stitch to create the `DevHire Cloud Operations` design direction:
  - dark navigation rail,
  - light recruitment operations workspace,
  - compact SaaS cards and tables,
  - 8px radius panels,
  - production signals for Gateway, OpenSearch, Kafka outbox, and SLOs.
- Added `.stitch/DESIGN.md` as the frontend visual source of truth.
- Reworked the Next.js frontend:
  - redesigned app shell with top command bar and platform signal rail,
  - redesigned Jobs and Job Detail pages with company logo marks, production badges, insight panels, and polished cards,
  - improved Candidate, Employer, Admin, Login, and Register screens with richer operational layout,
  - added real-company favicon logo support through domain-based image URLs with fallback initials,
  - added preview job data so the frontend still looks reviewable when the Docker backend stack is stopped.
- Added refreshed portfolio screenshots:
  - `docs/screenshots/frontend-redesign-jobs.png`,
  - `docs/screenshots/frontend-redesign-job-detail.png`.
- Updated README screenshot links in Vietnamese, English, and Japanese docs.

Verification:

- `npm run typecheck` passed on 2026-05-03.
- `npm run build` passed on 2026-05-03.
- Playwright local visual smoke opened `http://localhost:3000/jobs` and captured 3 job cards.
- Playwright local visual smoke opened `http://localhost:3000/jobs/preview-java-platform` and captured the job detail page.
- Browser in-app automation was attempted twice, but the Browser plugin could not attach to the tab in this environment. Playwright local was used as the visual QA fallback.

## Phase 39 - Docker runtime cleanup and portfolio stack polish

- Cleaned old local Docker containers from completed projects before running DevHire Cloud:
  - `jobhunter`,
  - `wavestream`,
  - `01-java-spring-laptopshop-starter-master`.
- Kept DevHire source files, images, and volumes intact; only stale containers were removed.
- Recovered Docker Desktop after a parallel BuildKit EOF error by restarting Docker Desktop and WSL, then rebuilt the DevHire stack with `COMPOSE_PARALLEL_LIMIT=1`.
- Rebuilt and ran the full Docker stack:
  - PostgreSQL,
  - Redis,
  - Kafka,
  - OpenSearch and OpenSearch Dashboards,
  - Prometheus,
  - Grafana,
  - Loki,
  - Tempo,
  - OpenTelemetry Collector,
  - all backend services,
  - frontend.
- Fixed local Docker CORS for the frontend host port `3001` so `http://localhost:3001` can call the API Gateway on `http://localhost:8080`.
- Added local company logo assets under `frontend/public/company-logos` and wired the frontend demo company catalog to use those stable assets before falling back to remote favicons.
- Cleaned local runtime smoke-test jobs from PostgreSQL/OpenSearch after verification so portfolio screenshots show curated seed data instead of generated smoke titles.
- Added the Docker runtime screenshot `docs/screenshots/docker-runtime-jobs.png`.

Verification:

- `docker compose build api-gateway frontend` passed on 2026-05-03.
- `docker compose up -d --force-recreate --no-deps api-gateway frontend` passed on 2026-05-03.
- `docker compose ps` showed all DevHire backend services healthy on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- CORS verification for `Origin: http://localhost:3001` against `/api/jobs` returned HTTP 200 with `Access-Control-Allow-Origin: http://localhost:3001`.
- `./scripts/api-smoke.ps1 -GatewayUrl http://localhost:8080` passed on 2026-05-03.
- Playwright Docker visual smoke opened `http://localhost:3001/jobs`, captured 8 live job cards, found 0 offline API warnings, and verified 8 local company logo images.
- `npm run typecheck` passed on 2026-05-03.
- `npm run build` passed on 2026-05-03.
- `mvn -T1 clean verify` passed on 2026-05-03.
- `git diff --cached --check` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo zricethezav/gitleaks:latest protect --staged --source /repo --redact --verbose` passed on 2026-05-03 with no leaks found.

## Phase 40 - Repository governance and release metadata

- Added root governance files:
  - `SECURITY.md`,
  - `CONTRIBUTING.md`,
  - `CODE_OF_CONDUCT.md`,
  - `CHANGELOG.md`.
- Added GitHub pull request and issue templates.
- Added `docs/github-profile.md` with repository About description, topics, branch protection guidance, and status check recommendations.
- Added initial `docs/release-notes/v0.1.0.md`.
- Kept the pasted Anthropic API key out of every file; all future Claude configuration uses environment placeholders only.

Verification:

- `git diff --check` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo zricethezav/gitleaks:latest detect --source /repo --no-git --redact --verbose` passed on 2026-05-03 with no leaks found.
- Initial `mvn -T1 clean verify` hit a local JVM native memory allocation failure while the full Docker stack was running; Docker was stopped, ignored JVM crash logs were removed, and the command was rerun with conservative `MAVEN_OPTS`.
- `mvn -T1 clean verify` passed on 2026-05-03.

## Phase 41 - Trilingual portfolio case-study documentation

- Rewrote root `README.md` in Vietnamese as a recruiter-facing production case study with:
  - screenshots,
  - architecture diagram,
  - tech stack,
  - services,
  - demo flow,
  - run/test commands,
  - production-ready highlights,
  - roadmap.
- Rewrote `docs/README_EN.md` and `docs/README_JA.md` with the same portfolio narrative.
- Added `docs/portfolio-case-study.md`.
- Added `docs/production-readiness.md`.
- Added operations runbooks:
  - `docs/runbooks/incident-response.md`,
  - `docs/runbooks/backup-restore.md`.

Verification:

- `git diff --check` passed on 2026-05-03.
- UTF-8 sanity check for `README.md`, `docs/README_EN.md`, and `docs/README_JA.md` passed on 2026-05-03 with no replacement characters or common mojibake byte markers.
- `mvn -T1 clean verify` passed on 2026-05-03.

## Phase 42 - Claude Haiku AI assistant service foundation

- Added Maven module `ai-service` on port `8088`.
- Added `devhire_ai` PostgreSQL database initialization.
- Added Flyway schema for:
  - AI conversations,
  - AI messages,
  - knowledge documents and chunks,
  - usage events,
  - outbox events.
- Added Claude Haiku configuration placeholders:
  - `ANTHROPIC_API_KEY`,
  - `ANTHROPIC_BASE_URL`,
  - `ANTHROPIC_MODEL`,
  - `ANTHROPIC_MAX_TOKENS`,
  - `DEVHIRE_AI_DEMO_FALLBACK_ENABLED`.
- Implemented `AnthropicClaudeClient` against the Anthropic Messages API with env-only secrets.
- Implemented deterministic portfolio fallback when no Anthropic key is configured.
- Added RAG-style knowledge retrieval from classpath knowledge documents.
- Added internal tool context:
  - `search_jobs`,
  - `get_platform_health_snapshot`.
- Added conversation/message persistence and usage records.
- Added audit events through transactional outbox for AI requests and fallback usage.
- Wired API Gateway routes:
  - `/api/ai/**`,
  - `/api/admin/ai/**`.
- Wired Docker Compose service `ai-service`.
- Updated Java service Dockerfiles so the new Maven module resolves during Docker builds.

Verification:

- `mvn -T1 -pl common-lib,api-gateway,ai-service test` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `git diff --check` passed on 2026-05-03.
- `mvn -T1 clean verify` passed on 2026-05-03.

## Phase 45 - Claude AI frontend workspace

- Added the `/assistant` workspace to the Next.js frontend.
- Added sidebar navigation and page metadata for the Claude AI portfolio assistant.
- Implemented a protected streaming chat experience through the API Gateway:
  - recruiter-oriented suggested prompts,
  - Claude model/fallback status badges,
  - cited answer rendering,
  - tool trace inspection,
  - deterministic fallback visibility.
- Added frontend domain types and API helpers for AI chat responses.
- Styled the assistant workspace with responsive chat, citation, and tool trace layouts.

Verification:

- `npm run typecheck` passed on 2026-05-03.
- `npm run build` passed on 2026-05-03.

## Phase 46 - AI assistant observability and audit

- Added AI assistant operational metrics in `ai-service`:
  - chat request counter,
  - latency timer,
  - fallback counter,
  - tool-call counter by tool/status,
  - prompt/answer token estimate summaries.
- Added `AI_TOOL_EXECUTED` audit events alongside existing AI chat/fallback/reindex events.
- Added `ai-service:8088` to the Prometheus service scrape target list.
- Added Prometheus alert rules for:
  - AI p95 latency,
  - frequent fallback mode,
  - AI service 5xx rate.
- Extended the Grafana SLO dashboard with AI request rate, p95 latency, tool call, and fallback panels.
- Updated `docs/slo.md` with AI assistant SLOs, metrics, dashboard panels, and audit event names.

Verification:

- Grafana SLO dashboard JSON parsed successfully on 2026-05-03.
- `mvn -T1 -pl common-lib,ai-service test` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `docker run --rm --entrypoint promtool -v "${PWD}/infra/prometheus:/etc/prometheus" prom/prometheus:v3.0.1 check config /etc/prometheus/prometheus.yml` passed on 2026-05-03 with 9 rules found.
- `mvn -T1 clean verify` passed on 2026-05-03.

## Phase 47 - Portfolio demo automation

- Added `scripts/reset-demo-data.ps1` to clean generated smoke/demo rows from:
  - company-service database,
  - job-service database,
  - application-service database,
  - notification-service database,
  - audit-service database,
  - ai-service database,
  - OpenSearch job index.
- Added `scripts/portfolio-demo.ps1` to start the full portfolio stack, wait for Gateway/frontend/AI readiness, optionally reset demo data, run API smoke, and print recruiter-demo URLs and accounts.
- Extended `scripts/api-smoke.ps1` with an authenticated AI assistant smoke check through `/api/ai/chat`.
- Extended `scripts/e2e-smoke.ps1` with the `ai-service` high-port default and readiness check.
- Updated `docs/demo-script.md` with the Claude assistant demo flow and cleanup command.

Verification:

- PowerShell syntax parse passed for `scripts/reset-demo-data.ps1`, `scripts/portfolio-demo.ps1`, `scripts/api-smoke.ps1`, and `scripts/e2e-smoke.ps1` on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `./scripts/reset-demo-data.ps1 -DryRun -WhatIf` passed on 2026-05-03.

## Phase 48 - AI assistant browser coverage

- Added Playwright `assistant-smoke.spec.ts` for the protected Claude AI assistant flow:
  - candidate login,
  - `/assistant` navigation,
  - recruiter demo prompt,
  - cited answer assertion,
  - tool trace assertion.
- Added stable assistant test IDs for chat messages, citations, and tool traces.
- Extended portfolio screenshot capture to include the assistant page after a real prompt.
- Updated the frontend `e2e` script to include assistant smoke coverage.

Verification:

- `npm run typecheck` passed on 2026-05-03.
- `npm run build` passed on 2026-05-03.

## Phase 49 - AI service CI and documentation gates

- Added `.github/workflows/docs.yml` for portfolio documentation quality checks.
- Added `scripts/docs-quality.ps1` to verify required docs, UTF-8 safety, unsafe placeholders, and AI demo-script coverage.
- Added `ai-service` to Docker image build matrix.
- Added `ai-service` to release image publishing matrix.
- Added `ai-service` to Trivy image scan matrix.
- Added Docker Dependabot monitoring for `ai-service`.

Verification:

- `./scripts/docs-quality.ps1` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:latest` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.

## Phase 50 - AI assistant release documentation

- Added `docs/ai-assistant.md` with endpoints, RAG sources, tools, metrics, audit events, smoke commands, and security notes.
- Added `docs/claude-haiku.md` with provider configuration, fallback behavior, cost guardrails, and production upgrade path.
- Added ADR `docs/ADR/0007-claude-haiku-ai-assistant.md`.
- Updated Vietnamese, English, and Japanese README files so `ai-service` is represented as a delivered service rather than a future roadmap item.
- Updated `docs/architecture.md`, `docs/api.http`, `CHANGELOG.md`, and `docs/release-notes/v0.1.0.md` for the AI assistant release scope.

Verification:

- `./scripts/docs-quality.ps1` passed on 2026-05-03.

## Phase 51 - Final production readiness polish

- Added a `postgres-init` one-shot Docker Compose service that creates missing `devhire_*` databases on every stack startup.
- Fixed the final Docker runtime issue where an existing local PostgreSQL volume did not yet contain `devhire_ai`; this can happen after adding a new service to an already-initialized Compose volume.
- Updated service dependencies so database-backed services wait for `postgres-init` instead of only waiting for PostgreSQL health.
- Hardened Playwright selectors to use exact headings after the richer frontend introduced duplicate text matches.
- Captured the final assistant screenshot at `docs/screenshots/assistant-page.png`.
- Updated README screenshot sections to include the Claude AI assistant.
- Cleaned generated smoke/demo rows with `scripts/reset-demo-data.ps1` after runtime verification.

Verification:

- `mvn -T1 clean verify` passed on 2026-05-03.
- `npm run typecheck` passed on 2026-05-03.
- `npm run build` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `./scripts/docs-quality.ps1` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:latest` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo zricethezav/gitleaks:latest detect --source /repo --no-git --redact --verbose` passed on 2026-05-03 with no leaks found.
- `docker run --rm --entrypoint promtool -v "${PWD}/infra/prometheus:/etc/prometheus" prom/prometheus:v3.0.1 check config /etc/prometheus/prometheus.yml` passed on 2026-05-03 with 9 rules found.
- First `docker compose up -d --build` exposed the missing `devhire_ai` database in an existing local volume; the Compose database init service was added and the stack was rebuilt.
- Final `docker compose up -d --build` passed on 2026-05-03.
- `docker compose ps` showed all backend services healthy, including `ai-service`, on 2026-05-03.
- `./scripts/api-smoke.ps1 -GatewayUrl http://localhost:8080` passed on 2026-05-03 with `aiAssistantCheck: ok`.
- `npm run e2e` passed on 2026-05-03.
- `npm run screenshots` passed on 2026-05-03.

## Phase 52 - AI provider diagnostics and evaluation gate

- Added admin-only AI provider diagnostics at `GET /api/admin/ai/provider/status`.
- The diagnostics response reports provider, model, Anthropic host, API version, max tokens, fallback setting, and runtime mode without exposing API keys.
- Added unit and controller coverage for safe provider status behavior.
- Added `docs/ai/eval-prompts.json` as the assistant evaluation prompt pack.
- Added `scripts/ai-eval.ps1` to run authenticated assistant evaluations through API Gateway.
- Added `.github/workflows/ai-eval.yml` as a weekly/manual AI evaluation gate with report and failure log artifacts.
- Extended `scripts/api-smoke.ps1` and `docs/api.http` with the provider diagnostics check.
- Added `docs/ai-evaluation.md` and updated trilingual README pointers for the AI eval gate.

Verification:

- `mvn -T1 -pl common-lib,ai-service test` passed on 2026-05-03.
- PowerShell syntax parse passed for `scripts/ai-eval.ps1`, `scripts/api-smoke.ps1`, and `scripts/docs-quality.ps1` on 2026-05-03.
- `./scripts/docs-quality.ps1` passed on 2026-05-03.
- `docker compose config --quiet` passed on 2026-05-03.
- `docker compose build ai-service` passed on 2026-05-03.
- `docker compose up -d --no-deps ai-service` passed on 2026-05-03.
- `./scripts/ai-eval.ps1 -GatewayUrl http://localhost:8080` passed on 2026-05-03 with 4 prompt evaluations, citations, and tool traces.
- `./scripts/api-smoke.ps1 -GatewayUrl http://localhost:8080` passed on 2026-05-03 with `aiProviderMode: DEMO_FALLBACK` and `aiAssistantCheck: ok`.
- `mvn -T1 clean verify` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:latest` passed on 2026-05-03.
- `docker run --rm -v "${PWD}:/repo" -w /repo zricethezav/gitleaks:latest detect --source /repo --no-git --redact --verbose` passed on 2026-05-03 with no leaks found.
- `git diff --check` passed on 2026-05-03.

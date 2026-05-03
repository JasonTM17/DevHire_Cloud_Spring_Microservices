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

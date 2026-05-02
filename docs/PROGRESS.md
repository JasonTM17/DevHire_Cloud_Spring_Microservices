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

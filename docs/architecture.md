# DevHire Cloud Architecture Notes

DevHire Cloud is a Java Spring Boot microservices recruitment platform for portfolio use.

## Services

- `api-gateway`: public ingress, JWT validation, routing, CORS, and rate limiting.
- `auth-service`: identity, JWT access tokens, refresh token rotation, logout, and demo users.
- `user-service`: candidate and employer profiles.
- `company-service`: employer company onboarding and admin approval.
- `job-service`: job posting workflow and PostgreSQL-backed search.
- `application-service`: candidate applications and status history.
- `notification-service`: internal notifications from domain events.
- `audit-service`: administrative audit log ingestion and querying.
- `common-lib`: shared DTOs, error model, constants, and event contracts.

## Communication

- External calls enter through the gateway.
- Synchronous service-to-service calls use HTTP clients where ownership checks need remote facts.
- Asynchronous domain events use Kafka topics.
- Each service owns its own database schema/database and never reads another service database directly.


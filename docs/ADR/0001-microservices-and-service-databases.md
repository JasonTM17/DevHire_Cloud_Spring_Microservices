# ADR 0001 - Microservices And Service-Owned Databases

## Status

Accepted

## Context

DevHire Cloud is a portfolio project intended to show production-style backend architecture, not a single CRUD demo. The business domain naturally separates authentication, profiles, companies, jobs, applications, notifications, audit logs, and search.

## Decision

Use independent Spring Boot services behind `api-gateway`. Each service owns its database/schema and exposes behavior through HTTP APIs or Kafka events. Services do not read each other's database tables directly and do not share JPA entities.

## Consequences

- Service boundaries and ownership are clear for hiring review.
- Flyway migrations stay local to each service.
- Cross-service workflows require explicit contracts through REST/Feign or events.
- Local development needs Docker Compose because the platform has multiple runtime dependencies.

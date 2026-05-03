# ADR 0002 - Transactional Outbox For Domain Events

## Status

Accepted

## Context

Several important actions must publish events: register, login, create/approve company, create/approve job, submit application, update application status, and notification creation. Direct Kafka publishing inside service methods can lose events if the database transaction commits but Kafka publishing fails, or publish events for rolled-back transactions.

## Decision

Use a transactional outbox table in every producing service. Business logic writes the domain change and an `outbox_events` row in the same transaction. A scheduled publisher reads pending rows, publishes to Kafka, and marks rows as `PUBLISHED`, `FAILED`, or `DEAD_LETTER`.

Consumers store `processed_events` by `eventId` to avoid duplicate notification/audit processing.

## Consequences

- Event publishing becomes retryable and observable in PostgreSQL.
- Consumers become idempotent.
- The implementation remains simpler than Debezium for a portfolio/local stack.
- Future production upgrades can replace the scheduled publisher with CDC without changing event contracts.

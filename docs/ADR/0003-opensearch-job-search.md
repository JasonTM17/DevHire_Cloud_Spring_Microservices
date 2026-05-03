# ADR 0003 - OpenSearch Job Search With PostgreSQL Fallback

## Status

Accepted

## Context

Job search needs keyword, skill, location, salary, level, pagination, and sorting. PostgreSQL full-text search is good enough for an initial version, but a recruitment platform benefits from a dedicated search engine as data grows.

## Decision

Use a search adapter boundary in `job-service`. The default production/local Docker profile uses OpenSearch for published jobs. PostgreSQL remains as a fallback adapter so the service can still run when OpenSearch is unavailable.

## Consequences

- Search can evolve without leaking OpenSearch details into controllers.
- Local Docker demonstrates a real search engine.
- Tests can still cover core search behavior without requiring OpenSearch for every unit test.
- Reindexing on startup keeps seeded published jobs discoverable in local demos.

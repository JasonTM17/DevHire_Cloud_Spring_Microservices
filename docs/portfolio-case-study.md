# DevHire Cloud Portfolio Case Study

## Problem

Hiring platforms look simple at the UI layer, but the backend has several production concerns: identity, role boundaries, company approval, job publishing, candidate applications, notifications, search freshness, auditability, and operational visibility.

DevHire Cloud turns that problem into a compact microservices portfolio. The goal is to show backend architecture and DevOps execution, not only endpoint scaffolding.

## Architecture Decisions

- Keep service ownership strict: no shared JPA entities and no cross-service database reads.
- Use synchronous calls only for small ownership checks, such as validating a job or company.
- Publish important business events through transactional outbox so database commits and event publishing do not drift silently.
- Use idempotent consumers for notification and audit ingestion.
- Keep search behind an adapter so OpenSearch can be replaced or extended without changing job workflow code.
- Treat local Docker as a real portfolio environment with observability and smoke tests.

## Production Signals

- Health probes and Prometheus metrics are exposed by every service.
- Grafana dashboards and Prometheus alert rules cover availability, latency, JVM pressure, search latency, and outbox failures.
- CI runs Maven verification, frontend build, coverage gates, Docker image builds, security scans, Terraform validation, API smoke, k6 smoke, and browser E2E.
- Deployment assets include Docker Compose, production Compose sample, Kubernetes raw manifests, Helm, Argo CD, and AWS Terraform blueprint.

## Demo Story

1. Employer creates a company.
2. Admin approves the company.
3. Employer submits a job for review.
4. Admin publishes the job.
5. Candidate searches and applies.
6. Employer updates the application status.
7. Candidate receives a notification.
8. Admin inspects audit logs.
9. Grafana shows platform readiness and SLO signals.

## What This Demonstrates

- Java/Spring backend engineering.
- Microservices boundaries and operational tradeoffs.
- Security and token lifecycle design.
- Event-driven consistency and failure handling.
- Infrastructure-as-code and deployment literacy.
- Professional documentation and repeatable demo discipline.

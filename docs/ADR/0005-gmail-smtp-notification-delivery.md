# ADR 0005 - Gmail SMTP Notification Delivery

## Status

Accepted

## Context

The notification service must persist internal notifications and optionally send real email. Gmail SMTP is practical for a portfolio demo, but provider credentials are sensitive and SMTP delivery can fail transiently.

## Decision

Use Spring Mail with environment-driven SMTP settings. Real Gmail app passwords live only in local `.env`, CI/CD secrets, Kubernetes Secrets, Docker secrets, or a secret manager. Notification creation persists internal notification first. A scheduled delivery worker sends email from the database queue with lifecycle states: `PENDING`, `SENDING`, `SENT`, `FAILED_RETRYABLE`, `FAILED_PERMANENT`, and `DISABLED`.

## Consequences

- Users do not lose internal notifications when SMTP fails.
- Email delivery can be retried with exponential backoff and rate limiting.
- Gmail works for local smoke tests, while production can swap to another SMTP provider.
- Secrets policy is clear and enforceable by Gitleaks.

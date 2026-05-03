# ADR 0004 - JWT Access Tokens And Rotating Refresh Tokens

## Status

Accepted

## Context

The platform has three user roles: `ADMIN`, `EMPLOYER`, and `CANDIDATE`. The API Gateway is the public ingress and needs to reject invalid requests before forwarding them to backend services.

## Decision

Use short-lived signed JWT access tokens and longer-lived rotating refresh tokens. Passwords are hashed with BCrypt. Logout/revoke stores access tokens in Redis blacklist. Gateway validates JWT and forwards trusted identity headers to services, while services still enforce role and ownership rules.

## Consequences

- API calls remain stateless for normal access-token validation.
- Refresh token rotation limits replay impact.
- Redis blacklist provides immediate logout behavior for access tokens.
- JWT secret must be environment-driven and never committed.

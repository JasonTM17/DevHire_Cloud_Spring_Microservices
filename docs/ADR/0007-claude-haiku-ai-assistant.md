# ADR 0007 - Claude Haiku AI Assistant

## Status

Accepted

## Context

DevHire Cloud is a portfolio system. The assistant should help reviewers understand the platform, but it must not require expensive provider calls or expose secrets during CI and local demos.

## Decision

Add `ai-service` as an independent Spring Boot service using Anthropic Claude Haiku as the default provider. The service owns `devhire_ai`, persists conversations, retrieves curated platform context, calls job/platform tools, and emits audit/metrics. When `ANTHROPIC_API_KEY` is not configured, it uses deterministic fallback mode.

## Consequences

- Recruiters can ask architecture and demo-flow questions from the frontend.
- The system demonstrates AI integration without weakening secret hygiene.
- CI remains deterministic and inexpensive.
- Future provider upgrades can happen behind `ClaudeChatClient` without changing Gateway or frontend contracts.

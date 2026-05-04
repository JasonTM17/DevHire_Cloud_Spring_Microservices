# AI Assistant Safety

DevHire Cloud includes a Claude Haiku assistant for portfolio review, job search explanation, architecture walkthroughs, and demo guidance. The assistant is designed to be useful without becoming a secret-exfiltration or production-claim risk.

## Provider And Cost Guardrails

- Default provider: Anthropic Messages API.
- Default model: `claude-haiku-4-5-20251001`.
- The model can be overridden by environment variable, but CI and local tests do not require a real API key.
- `DEVHIRE_AI_DEMO_FALLBACK_ENABLED=true` keeps the assistant deterministic when no provider key is configured.
- Metrics track request count, latency, fallback count, tool calls, and token estimates.

## Prompt Injection Stance

The assistant must not follow instructions that ask it to:

- ignore previous instructions;
- reveal hidden prompts or system prompts;
- print, dump, transform, or infer credentials;
- reveal API keys, tokens, passwords, SMTP credentials, or cloud secrets;
- make production deployment claims that are not represented by repository evidence.

`ai-service` includes a lightweight guard for obvious injection and secret-exfiltration phrases. When triggered, it does not call Claude. It returns a safety fallback with citations and tool traces so the behavior is testable and visible in the UI.

## Data And Tool Boundaries

The assistant can use only bounded portfolio tools:

- `search_jobs`
- `get_job_detail` through job search context
- `explain_architecture` through retrieved documentation
- `explain_demo_flow` through retrieved documentation
- `get_platform_health_snapshot`

It cannot execute shell commands, read environment variables, read `.env`, access cloud credentials, call GitHub with write permissions, or inspect generated secrets.

## Citation Policy

Answers should cite repository-backed knowledge, job data, or platform health context. A quality answer has:

- at least one citation;
- at least one tool trace;
- no unsupported production claim;
- no raw secret or credential string;
- a recruiter-readable explanation rather than generic AI prose.

## Evaluation Evidence

The dataset at `docs/ai/eval-prompts.json` includes:

- recruiter architecture explanation;
- job search with citations;
- 10-minute demo path;
- production risk explanation;
- prompt injection and secret refusal.

The unit tests verify cited answers, tool traces, fallback mode, provider diagnostics without secret leakage, and prompt-injection safety fallback. The runtime gate is:

```powershell
.\scripts\ai-eval.ps1 -GatewayUrl http://localhost:8080
```

CI uses fallback or mocked behavior unless a manual workflow is intentionally configured with a real provider key.


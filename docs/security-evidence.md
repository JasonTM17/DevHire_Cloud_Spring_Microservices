# Security Evidence

This page maps DevHire Cloud security controls to concrete repository evidence. It is written for reviewers who want to see how the project handles supply-chain risk without requiring cloud credentials.

## Automated Gates

| Gate | Workflow | Mode | Evidence |
| --- | --- | --- | --- |
| Secret scanning | `.github/workflows/security.yml` | push, pull request, schedule | Gitleaks blocks committed secrets using `.gitleaks.toml`. |
| Filesystem vulnerability scan | `.github/workflows/security.yml` | push, pull request, schedule | Trivy scans the repository and uploads a report artifact. |
| Docker image scan | `.github/workflows/security.yml` | manual, schedule | Trivy scans each service image with report artifacts, non-blocking for portfolio schedules. |
| SBOM | `.github/workflows/security.yml` | push, pull request, schedule | Anchore Syft emits a CycloneDX SBOM artifact. |
| Dependency review | `.github/workflows/security.yml` | pull request | GitHub dependency review fails high-severity dependency changes. |
| Static application analysis | `.github/workflows/codeql.yml` | push, pull request, schedule | CodeQL analyzes Java/Kotlin and JavaScript/TypeScript. |
| OpenSSF posture | `.github/workflows/scorecard.yml` | manual, schedule, targeted pull request | Scorecard SARIF is uploaded as an artifact first, then can become a harder gate later. |
| Dependabot triage | `.github/workflows/dependency-maintenance.yml` | manual, weekly | Open Dependabot PRs are grouped into low-risk, medium-risk, and deferred major batches. |

## Runtime Security Controls

- Gateway JWT validation strips spoofed identity headers before forwarding to services.
- Redis-backed logout blacklist blocks revoked access tokens at the gateway.
- Role and ownership checks remain in service controllers and service layers.
- Gateway responses include common security headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and a restrictive API content security policy.
- CORS is environment driven and documented in `.env.example`; production examples should list explicit origins only.
- Passwords are hashed with BCrypt and refresh tokens are rotated.

## Secret Policy Evidence

- `.env`, `.env.*`, tfstate, kubeconfig, generated plans, reports, and backups are ignored.
- `.env.example`, `.env.gmail.example`, and Kubernetes `secret.example.yaml` contain placeholders only.
- AI and SMTP provider secrets are read from environment variables, Kubernetes Secrets, AWS Secrets Manager placeholders, or GitHub Secrets.
- CI AI tests use mocked provider responses unless a manual smoke workflow is explicitly configured with repository secrets.

## Dependency Policy Evidence

The curated dependency process is documented in `docs/dependency-maintenance.md`. The current stance is:

- patch and minor GitHub Actions updates can be batched after green CI;
- Docker base images are batched by service family;
- Maven, npm, Terraform provider, Node major, and Spring major updates require migration notes;
- major upgrades are deferred when they add risk without portfolio value.

## JWT Rotation Roadmap

The current portfolio implementation uses an environment-provided symmetric JWT secret. A production tenant can rotate it by deploying a new secret and revoking refresh tokens. The next hardening step is `kid` based signing keys with a JWKS endpoint:

1. introduce key id in JWT headers;
2. store active and previous signing keys in secret manager;
3. publish read-only JWKS for gateway validation;
4. retire previous keys after the maximum access-token lifetime.

## Review Checklist

1. Run `docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:latest`.
2. Run Gitleaks locally or inspect the `Security` workflow artifact.
3. Review CodeQL and Scorecard workflow files.
4. Confirm no real provider keys exist in committed docs, workflows, or examples.
5. Confirm `docs/dependency-maintenance.md` explains how Dependabot PRs are handled.

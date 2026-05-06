# Security Evidence

This page maps DevHire Cloud security controls to concrete repository evidence. It is written for reviewers who want to see how the project handles supply-chain risk without requiring cloud credentials.

## Automated Gates

| Gate | Workflow | Mode | Evidence |
| --- | --- | --- | --- |
| Secret scanning | `.github/workflows/security.yml` | push, pull request, schedule | Gitleaks blocks committed secrets using `.gitleaks.toml`. |
| Filesystem vulnerability scan | `.github/workflows/security.yml` | push, pull request, schedule | Trivy scans the repository and uploads a report artifact. |
| Docker image scan | `.github/workflows/security.yml` | pull request, manual, schedule | Trivy scans each service image and fails on actionable HIGH/CRITICAL findings. |
| SBOM | `.github/workflows/security.yml` | push, pull request, schedule | Anchore Syft emits a CycloneDX SBOM artifact. |
| Dependency review | `.github/workflows/security.yml` | pull request | GitHub dependency review runs as a supply-chain signal; if GitHub dependency graph is unavailable, the job records the limitation while the hard gates remain Gitleaks, Trivy, SBOM, Maven dependency tree, and CodeQL. |
| Static application analysis | `.github/workflows/codeql.yml` | push, pull request, schedule | CodeQL analyzes Java/Kotlin and JavaScript/TypeScript. |
| OpenSSF posture | `.github/workflows/scorecard.yml` | manual, schedule, targeted pull request | Scorecard SARIF is uploaded as an artifact first, then can become a harder gate later. |
| Dependabot triage | `.github/workflows/dependency-maintenance.yml` | manual, weekly | Open Dependabot PRs are grouped into low-risk, medium-risk, and deferred major batches. |

## Image Metadata And Provenance

Every backend service image and the Next.js frontend image now carries Open Container Initiative labels from the Dockerfile itself, not only from the GitHub workflow wrapper:

- `org.opencontainers.image.source` points to the public repository;
- `org.opencontainers.image.revision` records the exact Git commit SHA;
- `org.opencontainers.image.version` records the branch, release tag, or manual release image tag;
- `org.opencontainers.image.created` records the UTC build timestamp;
- `org.opencontainers.image.title`, `description`, and `licenses` make image inventory output readable for reviewers and scanners.

The `Docker Images` and `Security` workflows pass these values during pull request and branch builds. The `Release Images` workflow publishes the same metadata to GHCR and tags every image by both release version and commit SHA. SBOM generation and Trivy scanning then attach to images that can be traced back to repository source, commit, and release evidence.

Release images now request BuildKit provenance attestations and SBOM output during the GHCR publish workflow:

- `provenance: mode=max` records source, build input, and commit metadata for release images;
- `sbom: true` emits package inventory from the image build;
- workflow permissions include `attestations: write` and `id-token: write` so the project is ready for keyless provenance flows without storing signing keys.

Future real-cloud releases can add cosign keyless verification as a deployment admission check. The portfolio keeps this optional so normal pull requests do not require cloud or registry secrets.

Trivy filesystem scanning blocks critical repository vulnerabilities. Trivy image scanning now runs for pull requests, manual runs, and schedules, and it fails on actionable HIGH/CRITICAL image vulnerabilities instead of only uploading advisory artifacts. Runtime Docker images run `apk upgrade --no-cache` during image build so fixed Alpine packages, such as security-patched TLS libraries, are pulled into the final non-root image layers. The Maven parent also pins `tomcat.version` when a patched embedded Tomcat line is available before the next Spring Boot service release.

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

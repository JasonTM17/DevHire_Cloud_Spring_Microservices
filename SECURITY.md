# Security Policy

## Supported Versions

DevHire Cloud is a portfolio project, but the repository follows production-style security hygiene. Security fixes are applied to the `master` branch and documented in `CHANGELOG.md`.

| Version | Supported |
|---|---|
| `0.1.x` | Yes |

## Reporting A Vulnerability

Please do not open public issues for secrets, authentication bypasses, infrastructure exposure, or dependency vulnerabilities that can be exploited directly.

Report privately to the repository owner with:

- affected service or workflow,
- reproduction steps,
- expected impact,
- suggested mitigation if known.

## Secret Handling

- Never commit `.env`, `.env.claude`, `.env.gmail`, AWS credentials, kubeconfig, Terraform state, generated plans, or API keys.
- Use `.env.example`, GitHub Actions secrets, AWS Secrets Manager, or Kubernetes Secret references for configuration.
- Rotate any key that was pasted into chat, terminal output, screenshots, or issue comments.

## Security Controls In This Repository

- JWT access token and refresh token flow.
- BCrypt password hashing.
- Redis-backed token revocation and Gateway rate limiting.
- Role-based endpoint authorization.
- Gitleaks secret scanning.
- Trivy filesystem and image scanning.
- SBOM generation.
- Docker non-root service images.
- Kubernetes NetworkPolicy, PDB, HPA, resource quota, and secret examples.
- Terraform validation, linting, and config scanning.


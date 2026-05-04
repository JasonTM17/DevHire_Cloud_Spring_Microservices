# Versioning And Release Hygiene

DevHire Cloud uses release tags for portfolio milestones and snapshot versions for active development.

## Version Rules

- Public release tags use `vX.Y.Z`, for example `v0.3.0`.
- The `master` branch moves to the next development version after a release.
- Maven parent and all service modules must use the same snapshot version.
- Frontend version should match the next release number without `-SNAPSHOT`.
- Docker and GHCR images are tagged by release tag and commit SHA.
- Release evidence lives under `docs/release-evidence/<version>.md`.
- Release notes live under `docs/release-notes/<version>.md`.

## Current State

- Latest released portfolio version: `v0.3.0`.
- Current Maven development version: `0.3.0-SNAPSHOT`.
- Current frontend development version: `0.3.0`.
- Next planned release evidence: `docs/release-evidence/v0.4.0.md`.

## Release Flow

1. Keep `master` on a snapshot version while features are being added.
2. Verify CI, Docker, Security, Documentation, Terraform, and release evidence.
3. Update release notes and release evidence for the target version.
4. Tag from a green commit with `vX.Y.Z`.
5. Let `.github/workflows/release.yml` create the GitHub Release and publish GHCR images.
6. Move `master` to the next `X.Y+1.0-SNAPSHOT` development version.

# Versioning And Release Hygiene

DevHire Cloud separates public portfolio releases from active development snapshots.

## Current State

| Signal | Value |
|---|---|
| Latest public release | `v0.5.1` |
| Active Maven development version | `0.6.0-SNAPSHOT` |
| Active frontend development version | `0.6.0` |
| Helm chart version | `0.6.0` |
| Helm application version | `0.5.1` |
| Next milestone | `v0.6.0` product and reviewer facade cleanup |

## Rules

- Public release tags use `vX.Y.Z`.
- `master` moves to the next snapshot version after a release.
- Maven parent and all service modules must use the same snapshot version.
- Frontend version matches the next release number without `-SNAPSHOT`.
- Helm `version` tracks chart changes; Helm `appVersion` tracks the latest released application tag.
- Docker and GHCR images are tagged by release tag and commit SHA.
- Every release tag must have `docs/release-notes/<tag>.md`; the release workflow fails if the file is missing.
- Release evidence for old tags stays in the repo for audit history, but reviewer-facing docs point to the latest release first.

## Release Flow

1. Keep `master` protected and use PR review for release changes.
2. Update Maven, frontend, Helm, changelog, release notes, and release evidence.
3. Run docs, build, Docker, cloud, security, and frontend gates.
4. Tag from a green `master` commit with `vX.Y.Z`.
5. Let `.github/workflows/release.yml` publish GHCR images and create the GitHub Release from the matching release notes file.
6. Move `master` to the next development version after the release.

## Historical Evidence Policy

Older release evidence remains available under `docs/release-evidence/` for auditability. README and trilingual reviewer docs should not list every historical file; they should link to [status](status.md), [review evidence](REVIEW_EVIDENCE.md), and the latest release evidence first.

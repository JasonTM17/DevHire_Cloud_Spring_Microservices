# API Compatibility Policy

DevHire Cloud treats public HTTP endpoints, internal service HTTP endpoints, and Kafka event payloads as versioned contracts. The goal is not to freeze the platform forever; it is to make breaking changes visible before they surprise a consumer.

## Compatibility Gate

The committed source of truth is:

- `docs/contracts/api-compatibility-manifest.json`

Runtime OpenAPI snapshots are generated into `reports/api-compatibility/` by:

```powershell
.\scripts\api-compatibility.ps1 -GatewayUrl http://localhost:8080
```

For CI or review environments where the Docker stack is not running, the manifest can still be validated without network access:

```powershell
.\scripts\api-compatibility.ps1 -ManifestOnly
```

The script checks:

- required service names, ports, methods, local paths, gateway paths, and surfaces;
- duplicate endpoint contracts;
- gateway-facing paths use the `/api/...` convention;
- runtime OpenAPI documents contain every required path and HTTP method when the stack is available;
- async event contracts include topic, event type, version, and consumers.

Generated OpenAPI files are evidence, not source. They stay in `reports/` and must not be committed.

## Breaking Change Rules

A change is treated as breaking when it removes or renames a public path, removes a supported HTTP method, changes a required request field without a default, removes a response field consumed by another service, or changes an event type/version without a migration path.

Breaking changes require:

- a release note and migration note;
- an updated compatibility manifest;
- updated provider and consumer contract tests;
- green `mvn -T1 clean verify`;
- green API compatibility script against the running stack.

## Existing Contract Evidence

The current service compatibility tests cover both sides of the most important synchronous dependencies:

- `company-service` provider contract for `GET /internal/companies/{id}`;
- `job-service` consumer contract for the company internal response;
- `job-service` provider contract for `GET /internal/jobs/{id}`;
- `application-service` consumer contract for the job internal response.

Kafka payload compatibility is covered by `common-lib` event contract tests and the manifest async contract list. Event consumers are idempotent by event id, so replay and outbox retry do not create duplicate notifications or audit rows.

## Reviewer Path

1. Read `docs/contracts/api-compatibility-manifest.json` for the committed public and internal API surface.
2. Run `.\scripts\api-compatibility.ps1 -ManifestOnly` for static validation.
3. Start the stack and run `.\scripts\api-compatibility.ps1 -GatewayUrl http://localhost:8080` to compare the manifest against live OpenAPI documents.
4. Inspect provider and consumer tests under each service `src/test/java/.../contract` package.

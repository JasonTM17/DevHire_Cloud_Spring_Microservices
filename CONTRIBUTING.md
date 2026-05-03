# Contributing

DevHire Cloud is intentionally built like a professional microservices portfolio. Changes should be small, reviewable, tested, and documented.

## Development Workflow

1. Create a focused branch.
2. Make one logical change at a time.
3. Update `docs/PROGRESS.md` when a phase changes behavior, infrastructure, or verification.
4. Run verification before opening a pull request.
5. Keep commits conventional:
   - `feat(scope): ...`
   - `fix(scope): ...`
   - `test(scope): ...`
   - `docs(scope): ...`
   - `chore(scope): ...`
   - `ci(scope): ...`

## Local Verification

```powershell
mvn -T1 clean verify
cd frontend
npm run typecheck
npm run build
cd ..
docker compose config --quiet
```

For full demo verification:

```powershell
docker compose up --build
.\scripts\api-smoke.ps1 -GatewayUrl http://localhost:8080
```

## Pull Request Expectations

- Tests are meaningful, not `assertTrue(true)`.
- No entity or database sharing across services.
- No secrets in code, docs, screenshots, generated plans, or logs.
- DTO contracts and event payloads remain backward compatible unless the PR documents a migration.
- README and trilingual docs match the actual runnable code.


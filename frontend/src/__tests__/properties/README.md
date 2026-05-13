# Property-Based Tests

This directory contains property-based tests for the **ui-ux-refactor** feature using [fast-check](https://github.com/dubzzz/fast-check).

## File Naming Convention

All property test files follow the pattern:

```
<domain>.property.test.ts
```

Examples: `theme.property.test.ts`, `challengeFilter.property.test.ts`, `timer.property.test.ts`

## Header Comment Convention

Every property test file **must** start with a header comment identifying the feature and property number:

```typescript
// Feature: ui-ux-refactor, Property N: <short description>
// Validates: Requirements X.Y, X.Z
```

When a file contains multiple properties, list each one:

```typescript
// Feature: ui-ux-refactor
// Property 12: Timer severity classification is monotone
// Property 24: Timer announcement politeness matches severity
// Validates: Requirements 4.5, 9.5
```

## Iteration Counts

| Environment | Default Runs | How to Set |
|---|---|---|
| Local (development) | **100** | Default when no env var is set |
| CI (GitHub Actions) | **500** | Set via `FAST_CHECK_NUM_RUNS=500` env variable |

In test files, read the iteration count like this:

```typescript
const NUM_RUNS = Number(process.env.FAST_CHECK_NUM_RUNS) || 100;
```

Then pass it to `fc.assert`:

```typescript
fc.assert(
  fc.property(arbInput, (input) => {
    // ... property assertion
  }),
  { numRuns: NUM_RUNS }
);
```

## Running Tests

```bash
# Run all property tests (local, 100 iterations)
npm run test:properties

# Run with CI iteration count
FAST_CHECK_NUM_RUNS=500 npm run test:properties

# Run a specific property test file
node --test 'src/__tests__/properties/theme.property.test.ts'
```

## Test Framework

- **Runner**: Node.js built-in test runner (`node:test`)
- **Assertions**: Node.js built-in (`node:assert`)
- **Property generation**: `fast-check` v3+
- **DOM rendering** (when needed): `@testing-library/react` + `jsdom`

## Guidelines

1. Keep properties focused — one logical property per `fc.property()` call.
2. Use smart generators that constrain to the valid input space rather than filtering after generation.
3. Avoid mocks when possible; test pure logic directly.
4. Link each property to its requirement via the `Validates:` comment.
5. If a property test fails, the counterexample is triaged before fixing — it may reveal a spec gap.

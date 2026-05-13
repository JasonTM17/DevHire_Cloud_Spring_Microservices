// Feature: realtime-collaboration, Property 2: Exponential Backoff Delay Calculation
// Validates: Requirements 2.1

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { calculateBackoffDelay } from "../../hooks/useWebSocket.ts";

const NUM_RUNS = Number(process.env.FAST_CHECK_NUM_RUNS) || 100;

describe("Property 2: Exponential Backoff Delay Calculation", () => {
  it("for arbitrary attempt numbers n ≥ 1, delay equals min(2^(n-1) × 1000, 30000) ms", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (attempt) => {
          const actual = calculateBackoffDelay(attempt);
          const expected = Math.min(Math.pow(2, attempt - 1) * 1000, 30000);
          assert.equal(actual, expected);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("delay is always between 1000ms and 30000ms for valid attempts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        (attempt) => {
          const delay = calculateBackoffDelay(attempt);
          assert.ok(delay >= 1000, `delay ${delay} should be >= 1000`);
          assert.ok(delay <= 30000, `delay ${delay} should be <= 30000`);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("delay is monotonically non-decreasing with attempt number", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 99 }),
        (attempt) => {
          const current = calculateBackoffDelay(attempt);
          const next = calculateBackoffDelay(attempt + 1);
          assert.ok(next >= current, `delay(${attempt + 1})=${next} should be >= delay(${attempt})=${current}`);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

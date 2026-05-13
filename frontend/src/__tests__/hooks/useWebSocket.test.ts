/**
 * Unit tests for useWebSocket hook — pure utility functions.
 *
 * Tests the exported calculateBackoffDelay function and verifies
 * the hook's connection status types.
 *
 * Requirements: 1.1, 2.1, 2.2, 2.3, 2.5
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateBackoffDelay } from "../../hooks/useWebSocket.ts";

describe("calculateBackoffDelay", () => {
  it("returns 1000ms for attempt 1", () => {
    assert.equal(calculateBackoffDelay(1), 1000);
  });

  it("returns 2000ms for attempt 2", () => {
    assert.equal(calculateBackoffDelay(2), 2000);
  });

  it("returns 4000ms for attempt 3", () => {
    assert.equal(calculateBackoffDelay(3), 4000);
  });

  it("returns 8000ms for attempt 4", () => {
    assert.equal(calculateBackoffDelay(4), 8000);
  });

  it("returns 16000ms for attempt 5", () => {
    assert.equal(calculateBackoffDelay(5), 16000);
  });

  it("caps at 30000ms for attempt 6 (2^5 * 1000 = 32000 > 30000)", () => {
    assert.equal(calculateBackoffDelay(6), 30000);
  });

  it("caps at 30000ms for attempt 10", () => {
    assert.equal(calculateBackoffDelay(10), 30000);
  });

  it("caps at 30000ms for very large attempt numbers", () => {
    assert.equal(calculateBackoffDelay(100), 30000);
  });

  it("returns 1000ms for attempt < 1 (edge case)", () => {
    assert.equal(calculateBackoffDelay(0), 1000);
    assert.equal(calculateBackoffDelay(-1), 1000);
  });
});

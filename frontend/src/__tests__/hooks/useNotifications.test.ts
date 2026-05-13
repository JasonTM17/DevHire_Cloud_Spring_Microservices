/**
 * Unit tests for useNotifications hook — pure utility functions.
 *
 * Tests the exported reorderBySequence function which implements
 * the message reordering buffer logic (3s window).
 *
 * Requirements: 4.1, 4.4, 5.2, 5.3, 2.4, 13.2
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { reorderBySequence } from "../../lib/notifications/reorder.ts";
import type { Notification } from "../../types/domain.ts";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: overrides.id ?? "n-1",
    recipientId: "user-1",
    type: "SYSTEM",
    title: "Test",
    message: "Test message",
    read: false,
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00Z",
    sequenceNumber: overrides.sequenceNumber,
    ...overrides,
  };
}

describe("reorderBySequence", () => {
  it("returns empty array for empty input", () => {
    assert.deepEqual(reorderBySequence([]), []);
  });

  it("returns single item unchanged", () => {
    const n = makeNotification({ id: "n-1", sequenceNumber: 1 });
    const result = reorderBySequence([n]);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "n-1");
  });

  it("sorts messages by sequenceNumber ascending", () => {
    const n1 = makeNotification({ id: "n-1", sequenceNumber: 3 });
    const n2 = makeNotification({ id: "n-2", sequenceNumber: 1 });
    const n3 = makeNotification({ id: "n-3", sequenceNumber: 2 });

    const result = reorderBySequence([n1, n2, n3]);
    assert.equal(result[0].sequenceNumber, 1);
    assert.equal(result[1].sequenceNumber, 2);
    assert.equal(result[2].sequenceNumber, 3);
  });

  it("handles out-of-order messages correctly", () => {
    const messages = [
      makeNotification({ id: "n-5", sequenceNumber: 5 }),
      makeNotification({ id: "n-2", sequenceNumber: 2 }),
      makeNotification({ id: "n-4", sequenceNumber: 4 }),
      makeNotification({ id: "n-1", sequenceNumber: 1 }),
      makeNotification({ id: "n-3", sequenceNumber: 3 }),
    ];

    const result = reorderBySequence(messages);
    const ids = result.map((n) => n.id);
    assert.deepEqual(ids, ["n-1", "n-2", "n-3", "n-4", "n-5"]);
  });

  it("falls back to createdAt when sequenceNumber is missing", () => {
    const n1 = makeNotification({ id: "n-1", createdAt: "2024-01-01T00:03:00Z" });
    const n2 = makeNotification({ id: "n-2", createdAt: "2024-01-01T00:01:00Z" });
    const n3 = makeNotification({ id: "n-3", createdAt: "2024-01-01T00:02:00Z" });

    const result = reorderBySequence([n1, n2, n3]);
    assert.equal(result[0].id, "n-2");
    assert.equal(result[1].id, "n-3");
    assert.equal(result[2].id, "n-1");
  });

  it("does not mutate the original array", () => {
    const messages = [
      makeNotification({ id: "n-2", sequenceNumber: 2 }),
      makeNotification({ id: "n-1", sequenceNumber: 1 }),
    ];
    const original = [...messages];
    reorderBySequence(messages);
    assert.deepEqual(messages, original);
  });

  it("handles mixed messages with and without sequenceNumber", () => {
    const n1 = makeNotification({ id: "n-1", sequenceNumber: 5 });
    const n2 = makeNotification({ id: "n-2", createdAt: "2024-01-01T00:00:01Z" });
    const n3 = makeNotification({ id: "n-3", sequenceNumber: 3 });

    const result = reorderBySequence([n1, n2, n3]);
    // n2 has sequenceNumber undefined (treated as 0), so it comes first
    assert.equal(result[0].id, "n-2");
    assert.equal(result[1].id, "n-3");
    assert.equal(result[2].id, "n-1");
  });
});

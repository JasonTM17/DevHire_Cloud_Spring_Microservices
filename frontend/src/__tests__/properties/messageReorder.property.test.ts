// Feature: realtime-collaboration, Property 17: Message Reordering Buffer
// Validates: Requirements 13.2

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { reorderBySequence } from "../../lib/notifications/reorder.ts";
import type { Notification } from "../../types/domain.ts";

const NUM_RUNS = Number(process.env.FAST_CHECK_NUM_RUNS) || 100;

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generates a notification with a specific sequence number.
 */
function arbNotificationWithSequence(sequenceNumber: number): fc.Arbitrary<Notification> {
  return fc.record({
    id: fc.uuid(),
    recipientId: fc.constant("user-1"),
    type: fc.constantFrom("APPLICATION_STATUS", "ASSESSMENT_RESULT", "SYSTEM", "MESSAGE"),
    title: fc.string({ minLength: 1, maxLength: 50 }),
    message: fc.string({ minLength: 1, maxLength: 200 }),
    read: fc.boolean(),
    createdAt: fc.constant(new Date(Date.now() - sequenceNumber * 1000).toISOString()),
    sequenceNumber: fc.constant(sequenceNumber),
  });
}

/**
 * Generates a list of notifications with unique, ascending sequence numbers,
 * then returns a random permutation of them (simulating out-of-order delivery).
 */
function arbPermutedNotifications(): fc.Arbitrary<{
  original: Notification[];
  permuted: Notification[];
}> {
  return fc
    .integer({ min: 1, max: 50 })
    .chain((count) => {
      // Generate sequence numbers: 1, 2, 3, ..., count
      const seqNumbers = Array.from({ length: count }, (_, i) => i + 1);
      // Generate a notification for each sequence number
      const notifArbs = seqNumbers.map((seq) => arbNotificationWithSequence(seq));
      return fc.tuple(...notifArbs).chain((notifications) =>
        // Generate a random permutation of the notifications
        fc.shuffledSubarray(notifications, { minLength: count, maxLength: count }).map(
          (permuted) => ({
            original: notifications,
            permuted,
          })
        )
      );
    });
}

/**
 * Generates notifications with distinct sequence numbers (not necessarily contiguous)
 * and returns them in a random order.
 */
function arbSparsePermutedNotifications(): fc.Arbitrary<{
  expectedOrder: number[];
  permuted: Notification[];
}> {
  return fc
    .uniqueArray(fc.integer({ min: 1, max: 10_000 }), { minLength: 2, maxLength: 50 })
    .chain((seqNumbers) => {
      const sorted = [...seqNumbers].sort((a, b) => a - b);
      const notifArbs = sorted.map((seq) => arbNotificationWithSequence(seq));
      return fc.tuple(...notifArbs).chain((notifications) =>
        fc
          .shuffledSubarray(notifications, {
            minLength: notifications.length,
            maxLength: notifications.length,
          })
          .map((permuted) => ({
            expectedOrder: sorted,
            permuted,
          }))
      );
    });
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe("Property 17: Message Reordering Buffer", () => {
  it("buffer produces messages in ascending sequence order for any permutation", () => {
    fc.assert(
      fc.property(arbPermutedNotifications(), ({ original, permuted }) => {
        // Simulate the reorder buffer flush (after 3s window elapses)
        const reordered = reorderBySequence(permuted);

        // Verify: output is in strictly ascending sequence number order
        for (let i = 1; i < reordered.length; i++) {
          const prevSeq = reordered[i - 1].sequenceNumber ?? 0;
          const currSeq = reordered[i].sequenceNumber ?? 0;
          assert.ok(
            currSeq > prevSeq,
            `Messages not in ascending order: seq ${prevSeq} followed by seq ${currSeq}`
          );
        }

        // Verify: all messages are preserved (no loss)
        assert.equal(
          reordered.length,
          original.length,
          `Expected ${original.length} messages, got ${reordered.length}`
        );

        // Verify: the sequence numbers match the expected ascending order
        const expectedSeqs = original.map((n) => n.sequenceNumber).sort((a, b) => (a ?? 0) - (b ?? 0));
        const actualSeqs = reordered.map((n) => n.sequenceNumber);
        assert.deepEqual(actualSeqs, expectedSeqs, "Sequence numbers should be in ascending order");
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("buffer produces ascending order for sparse (non-contiguous) sequence numbers", () => {
    fc.assert(
      fc.property(arbSparsePermutedNotifications(), ({ expectedOrder, permuted }) => {
        const reordered = reorderBySequence(permuted);

        // Verify: output sequence numbers match expected ascending order
        const actualSeqs = reordered.map((n) => n.sequenceNumber);
        assert.deepEqual(
          actualSeqs,
          expectedOrder,
          "Sparse sequence numbers should be reordered to ascending"
        );

        // Verify: strictly ascending
        for (let i = 1; i < reordered.length; i++) {
          assert.ok(
            (reordered[i].sequenceNumber ?? 0) > (reordered[i - 1].sequenceNumber ?? 0),
            "Sequence numbers must be strictly ascending"
          );
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("reordering is idempotent — applying it twice yields the same result", () => {
    fc.assert(
      fc.property(arbPermutedNotifications(), ({ permuted }) => {
        const firstPass = reorderBySequence(permuted);
        const secondPass = reorderBySequence(firstPass);

        assert.deepEqual(
          firstPass.map((n) => n.sequenceNumber),
          secondPass.map((n) => n.sequenceNumber),
          "Reordering should be idempotent"
        );
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

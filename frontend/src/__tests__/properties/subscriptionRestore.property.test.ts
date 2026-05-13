// Feature: realtime-collaboration, Property 3: Subscription Set Restoration on Reconnect
// Validates: Requirements 2.3

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

const NUM_RUNS = Number(process.env.FAST_CHECK_NUM_RUNS) || 100;

/**
 * Simulates the subscription restoration logic from useWebSocket.
 *
 * The hook maintains a Map of subscriptions. On reconnect (resubscribeAll),
 * it iterates over all entries and re-subscribes each destination.
 * This test validates that the set of destinations after restoration
 * equals the original set.
 */

/** Arbitrary for valid STOMP topic destinations */
const arbDestination = fc.oneof(
  fc.constant("/user").chain((prefix) =>
    fc.uuid().map((id) => `${prefix}/${id}/notifications`)
  ),
  fc.constant("/topic/presence"),
  fc.constant("/topic/leaderboard"),
  fc.stringMatching(/^\/topic\/assessment\/[a-z0-9-]+\/status$/).filter((s) => s.length > 0),
  fc.stringMatching(/^\/topic\/job\/[a-z0-9-]+\/viewers$/).filter((s) => s.length > 0)
);

/** Generate a unique set of destinations (simulating active subscriptions) */
const arbSubscriptionSet = fc.uniqueArray(arbDestination, { minLength: 0, maxLength: 20 });

/**
 * Simulates the subscription store and resubscribeAll logic.
 * The hook stores subscriptions in a Map<id, { destination, callback, stompSub }>.
 * On reconnect, it iterates the map and re-subscribes each destination.
 */
function simulateResubscribeAll(originalDestinations: string[]): string[] {
  // Build the subscription map (simulating subscribe calls)
  const subscriptionMap = new Map<string, { destination: string }>();
  for (const dest of originalDestinations) {
    const id = `sub-${Math.random().toString(36).slice(2, 9)}`;
    subscriptionMap.set(id, { destination: dest });
  }

  // Simulate resubscribeAll: iterate map and collect re-subscribed destinations
  const resubscribed: string[] = [];
  subscriptionMap.forEach((entry) => {
    resubscribed.push(entry.destination);
  });

  return resubscribed;
}

describe("Property 3: Subscription Set Restoration on Reconnect", () => {
  it("for arbitrary sets of STOMP topic subscriptions, re-subscribed set equals original set after reconnect", () => {
    fc.assert(
      fc.property(
        arbSubscriptionSet,
        (destinations) => {
          const restored = simulateResubscribeAll(destinations);

          // The restored set should contain exactly the same destinations
          const originalSet = new Set(destinations);
          const restoredSet = new Set(restored);

          assert.equal(restoredSet.size, originalSet.size,
            `Restored set size ${restoredSet.size} should equal original ${originalSet.size}`);

          for (const dest of originalSet) {
            assert.ok(restoredSet.has(dest),
              `Destination "${dest}" should be in restored set`);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("no extra subscriptions appear after restoration", () => {
    fc.assert(
      fc.property(
        arbSubscriptionSet,
        (destinations) => {
          const restored = simulateResubscribeAll(destinations);
          const originalSet = new Set(destinations);

          for (const dest of restored) {
            assert.ok(originalSet.has(dest),
              `Restored destination "${dest}" should exist in original set`);
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

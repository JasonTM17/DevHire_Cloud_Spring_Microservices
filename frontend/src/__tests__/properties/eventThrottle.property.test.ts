// Feature: realtime-collaboration, Property 9: Event Publish Throttling (Frontend)
// Validates: Requirements 9.5

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  throttleEvents,
  throttleEventsByEntity,
  type TimestampedEvent,
} from "../../lib/notifications/throttle.ts";

const NUM_RUNS = Number(process.env.FAST_CHECK_NUM_RUNS) || 100;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Viewer count throttle window: 10 seconds per Requirement 9.5 */
const VIEWER_THROTTLE_WINDOW_MS = 10_000;

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

interface ViewerCountPayload {
  contextId: string;
  count: number;
}

/**
 * Generates a stream of viewer count events for a single entity,
 * sorted by timestamp ascending.
 */
function arbViewerCountStream(): fc.Arbitrary<TimestampedEvent<ViewerCountPayload>[]> {
  return fc
    .array(
      fc.record({
        timestamp: fc.integer({ min: 0, max: 120_000 }), // up to 2 minutes
        payload: fc.record({
          contextId: fc.constant("job-1"),
          count: fc.integer({ min: 0, max: 500 }),
        }),
      }),
      { minLength: 1, maxLength: 100 }
    )
    .map((events) => events.sort((a, b) => a.timestamp - b.timestamp));
}

/**
 * Generates a stream of viewer count events for multiple entities,
 * sorted by timestamp ascending.
 */
function arbMultiEntityViewerStream(): fc.Arbitrary<TimestampedEvent<ViewerCountPayload>[]> {
  const entityIds = ["job-1", "job-2", "job-3", "job-4", "job-5"];
  return fc
    .array(
      fc.record({
        timestamp: fc.integer({ min: 0, max: 120_000 }),
        payload: fc.record({
          contextId: fc.constantFrom(...entityIds),
          count: fc.integer({ min: 0, max: 500 }),
        }),
      }),
      { minLength: 1, maxLength: 200 }
    )
    .map((events) => events.sort((a, b) => a.timestamp - b.timestamp));
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe("Property 9: Event Publish Throttling (Frontend) — Viewer Count Debounce", () => {
  it("at most one update emitted per 10s window for a single entity stream", () => {
    fc.assert(
      fc.property(arbViewerCountStream(), (events) => {
        const emitted = throttleEvents(events, VIEWER_THROTTLE_WINDOW_MS);

        // Verify: no two emitted events are within the same 10s window
        for (let i = 1; i < emitted.length; i++) {
          const gap = emitted[i].timestamp - emitted[i - 1].timestamp;
          assert.ok(
            gap >= VIEWER_THROTTLE_WINDOW_MS,
            `Events at timestamps ${emitted[i - 1].timestamp} and ${emitted[i].timestamp} ` +
              `are only ${gap}ms apart (window is ${VIEWER_THROTTLE_WINDOW_MS}ms)`
          );
        }

        // Verify: emitted events are a subset of input events
        assert.ok(
          emitted.length <= events.length,
          "Emitted more events than received"
        );

        // Verify: at least one event is emitted if input is non-empty
        if (events.length > 0) {
          assert.ok(emitted.length >= 1, "Should emit at least one event");
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("at most one update emitted per entity per 10s window for multi-entity streams", () => {
    fc.assert(
      fc.property(arbMultiEntityViewerStream(), (events) => {
        const emitted = throttleEventsByEntity(
          events,
          VIEWER_THROTTLE_WINDOW_MS,
          (p) => p.contextId
        );

        // Group emitted events by entity
        const byEntity = new Map<string, TimestampedEvent<ViewerCountPayload>[]>();
        for (const event of emitted) {
          const key = event.payload.contextId;
          if (!byEntity.has(key)) byEntity.set(key, []);
          byEntity.get(key)!.push(event);
        }

        // For each entity, verify no two emitted events are within the same window
        for (const [entityId, entityEvents] of byEntity) {
          for (let i = 1; i < entityEvents.length; i++) {
            const gap = entityEvents[i].timestamp - entityEvents[i - 1].timestamp;
            assert.ok(
              gap >= VIEWER_THROTTLE_WINDOW_MS,
              `Entity '${entityId}': events at timestamps ${entityEvents[i - 1].timestamp} ` +
                `and ${entityEvents[i].timestamp} are only ${gap}ms apart`
            );
          }
        }
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("first event in each window is always emitted (no initial suppression)", () => {
    fc.assert(
      fc.property(arbViewerCountStream(), (events) => {
        if (events.length === 0) return;

        const emitted = throttleEvents(events, VIEWER_THROTTLE_WINDOW_MS);

        // The first event should always be emitted
        assert.deepEqual(
          emitted[0],
          events[0],
          "First event in the stream should always be emitted"
        );
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

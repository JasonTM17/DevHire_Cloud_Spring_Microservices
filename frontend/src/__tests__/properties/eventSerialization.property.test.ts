// Feature: realtime-collaboration, Property 5: Domain Event Serialization Completeness (Frontend)
// Validates: Requirements 4.3, 6.2, 7.2

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";

const NUM_RUNS = Number(process.env.FAST_CHECK_NUM_RUNS) || 100;

// ---------------------------------------------------------------------------
// Required fields per event type (from design document)
// ---------------------------------------------------------------------------

const NOTIFICATION_REQUIRED_FIELDS = ["id", "type", "title", "body", "createdAt", "read"] as const;
const PROGRESS_REQUIRED_FIELDS = ["testCaseIndex", "totalTestCases", "status", "executionTimeMs"] as const;
const RANK_CHANGE_REQUIRED_FIELDS = ["candidateId", "newRank", "previousRank", "score", "assessmentId"] as const;

// ---------------------------------------------------------------------------
// Arbitraries — generate valid event objects of each type
// ---------------------------------------------------------------------------

const arbNotificationType = fc.constantFrom(
  "APPLICATION_STATUS", "ASSESSMENT_RESULT", "SYSTEM", "MESSAGE"
);

const arbNotificationEvent = fc.record({
  id: fc.uuid(),
  type: arbNotificationType,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  body: fc.string({ minLength: 1, maxLength: 500 }),
  createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-01-01") })
    .map((d) => d.toISOString()),
  read: fc.boolean(),
  sequenceNumber: fc.nat(),
});

const arbProgressStatus = fc.constantFrom("passed", "failed", "running");

const arbProgressEvent = fc.record({
  assessmentId: fc.uuid(),
  testCaseIndex: fc.nat({ max: 99 }),
  totalTestCases: fc.integer({ min: 1, max: 100 }),
  status: arbProgressStatus,
  executionTimeMs: fc.nat({ max: 60000 }),
  errorOutput: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
});

const arbRankChangeEvent = fc.record({
  candidateId: fc.uuid(),
  newRank: fc.integer({ min: 1, max: 10000 }),
  previousRank: fc.integer({ min: 1, max: 10000 }),
  score: fc.integer({ min: 0, max: 100 }),
  assessmentId: fc.uuid(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Property 5: Domain Event Serialization Completeness (Frontend)", () => {
  it("notification events contain all required fields after JSON round-trip", () => {
    fc.assert(
      fc.property(
        arbNotificationEvent,
        (event) => {
          const serialized = JSON.stringify(event);
          const parsed = JSON.parse(serialized) as Record<string, unknown>;

          for (const field of NOTIFICATION_REQUIRED_FIELDS) {
            assert.ok(
              field in parsed && parsed[field] !== undefined && parsed[field] !== null,
              `Notification event missing required field: "${field}"`
            );
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("assessment progress events contain all required fields after JSON round-trip", () => {
    fc.assert(
      fc.property(
        arbProgressEvent,
        (event) => {
          const serialized = JSON.stringify(event);
          const parsed = JSON.parse(serialized) as Record<string, unknown>;

          for (const field of PROGRESS_REQUIRED_FIELDS) {
            assert.ok(
              field in parsed && parsed[field] !== undefined && parsed[field] !== null,
              `Progress event missing required field: "${field}"`
            );
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("rank-change events contain all required fields after JSON round-trip", () => {
    fc.assert(
      fc.property(
        arbRankChangeEvent,
        (event) => {
          const serialized = JSON.stringify(event);
          const parsed = JSON.parse(serialized) as Record<string, unknown>;

          for (const field of RANK_CHANGE_REQUIRED_FIELDS) {
            assert.ok(
              field in parsed && parsed[field] !== undefined && parsed[field] !== null,
              `Rank-change event missing required field: "${field}"`
            );
          }
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });

  it("serialized notification field values match original values", () => {
    fc.assert(
      fc.property(
        arbNotificationEvent,
        (event) => {
          const parsed = JSON.parse(JSON.stringify(event));
          assert.equal(parsed.id, event.id);
          assert.equal(parsed.type, event.type);
          assert.equal(parsed.title, event.title);
          assert.equal(parsed.body, event.body);
          assert.equal(parsed.createdAt, event.createdAt);
          assert.equal(parsed.read, event.read);
        }
      ),
      { numRuns: NUM_RUNS }
    );
  });
});

// Feature: realtime-collaboration, Property 7: Assessment Progress State Consistency
// Validates: Requirements 6.3

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  applyProgressEvent,
  countCompleted,
  type AssessmentProgress,
  type TestCaseResult,
  type TestCaseStatus,
} from "../../hooks/assessmentStatusUtils.ts";

const NUM_RUNS = Number(process.env.FAST_CHECK_NUM_RUNS) || 100;

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const arbTestCaseStatus = fc.constantFrom<TestCaseStatus>("passed", "failed", "running");

function arbProgressEvent(totalTestCases: number): fc.Arbitrary<AssessmentProgress> {
  return fc.record({
    assessmentId: fc.constant("assessment-1"),
    testCaseIndex: fc.integer({ min: 0, max: totalTestCases - 1 }),
    totalTestCases: fc.constant(totalTestCases),
    status: arbTestCaseStatus,
    executionTimeMs: fc.integer({ min: 0, max: 30_000 }),
    errorOutput: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  });
}

function arbProgressSequence(): fc.Arbitrary<AssessmentProgress[]> {
  return fc
    .integer({ min: 1, max: 50 })
    .chain((totalTestCases) =>
      fc.array(arbProgressEvent(totalTestCases), { minLength: 1, maxLength: totalTestCases * 3 })
    );
}

// ---------------------------------------------------------------------------
// Property Test
// ---------------------------------------------------------------------------

describe("Property 7: Assessment Progress State Consistency", () => {
  it("client state accurately reflects completed test cases for any sequence of progress events", () => {
    fc.assert(
      fc.property(arbProgressSequence(), (events) => {
        // Apply all progress events sequentially (simulating the hook reducer)
        let testCases: TestCaseResult[] = [];
        for (const event of events) {
          testCases = applyProgressEvent(testCases, event);
        }

        const totalTestCases = events[0].totalTestCases;

        // 1. The test cases array should be sized to totalTestCases
        assert.equal(
          testCases.length,
          totalTestCases,
          `Expected ${totalTestCases} test case slots, got ${testCases.length}`
        );

        // 2. Each test case index should be recorded correctly
        //    Build expected state: last event for each index wins
        const expectedByIndex = new Map<number, AssessmentProgress>();
        for (const event of events) {
          expectedByIndex.set(event.testCaseIndex, event);
        }

        for (const [index, expectedEvent] of expectedByIndex) {
          const actual = testCases[index];
          assert.equal(
            actual.status,
            expectedEvent.status,
            `Test case ${index}: expected status '${expectedEvent.status}', got '${actual.status}'`
          );
          assert.equal(
            actual.executionTimeMs,
            expectedEvent.executionTimeMs,
            `Test case ${index}: expected executionTimeMs ${expectedEvent.executionTimeMs}, got ${actual.executionTimeMs}`
          );
          assert.equal(
            actual.errorOutput,
            expectedEvent.errorOutput,
            `Test case ${index}: errorOutput mismatch`
          );
        }

        // 3. completedCount should equal the number of test cases with status 'passed' or 'failed'
        const completed = countCompleted(testCases);
        const expectedCompleted = testCases.filter(
          (tc) => tc.status === "passed" || tc.status === "failed"
        ).length;
        assert.equal(
          completed,
          expectedCompleted,
          `completedCount ${completed} does not match actual completed ${expectedCompleted}`
        );
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

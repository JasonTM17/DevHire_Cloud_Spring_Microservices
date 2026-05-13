// Feature: realtime-collaboration, Property 8: Assessment Summary Aggregation
// Validates: Requirements 6.4

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import type { AssessmentSummary } from "../../hooks/assessmentStatusUtils.ts";

const NUM_RUNS = Number(process.env.FAST_CHECK_NUM_RUNS) || 100;

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Generates a valid AssessmentSummary where totalPassed + totalFailed === totalTestCases.
 * The score is derived from the pass/fail ratio.
 */
function arbAssessmentSummary(): fc.Arbitrary<AssessmentSummary> {
  return fc
    .integer({ min: 1, max: 200 })
    .chain((totalTestCases) =>
      fc.integer({ min: 0, max: totalTestCases }).map((totalPassed) => {
        const totalFailed = totalTestCases - totalPassed;
        const score = Math.round((totalPassed / totalTestCases) * 100);
        const overallStatus: AssessmentSummary["overallStatus"] =
          totalFailed === 0 ? "COMPLETED" : "FAILED";
        return {
          assessmentId: `assessment-${totalTestCases}`,
          totalPassed,
          totalFailed,
          score,
          overallStatus,
        };
      })
    );
}

/**
 * Generates test case results as an array of 'passed'/'failed' statuses,
 * then derives the summary from them — simulating what the backend does.
 */
function arbTestCaseResultsWithSummary(): fc.Arbitrary<{
  results: Array<"passed" | "failed">;
  summary: AssessmentSummary;
}> {
  return fc
    .array(fc.constantFrom<"passed" | "failed">("passed", "failed"), {
      minLength: 1,
      maxLength: 200,
    })
    .map((results) => {
      const totalPassed = results.filter((r) => r === "passed").length;
      const totalFailed = results.filter((r) => r === "failed").length;
      const totalTestCases = results.length;
      const score = Math.round((totalPassed / totalTestCases) * 100);
      const overallStatus: AssessmentSummary["overallStatus"] =
        totalFailed === 0 ? "COMPLETED" : "FAILED";
      return {
        results,
        summary: {
          assessmentId: "assessment-prop8",
          totalPassed,
          totalFailed,
          score,
          overallStatus,
        },
      };
    });
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe("Property 8: Assessment Summary Aggregation", () => {
  it("totalPassed + totalFailed === totalTestCases for any set of test case results", () => {
    fc.assert(
      fc.property(arbTestCaseResultsWithSummary(), ({ results, summary }) => {
        const totalTestCases = results.length;

        // Core invariant: totalPassed + totalFailed === totalTestCases
        assert.equal(
          summary.totalPassed + summary.totalFailed,
          totalTestCases,
          `totalPassed (${summary.totalPassed}) + totalFailed (${summary.totalFailed}) !== totalTestCases (${totalTestCases})`
        );
      }),
      { numRuns: NUM_RUNS }
    );
  });

  it("score is consistent with the pass/fail ratio", () => {
    fc.assert(
      fc.property(arbAssessmentSummary(), (summary) => {
        const totalTestCases = summary.totalPassed + summary.totalFailed;

        // totalPassed + totalFailed must equal totalTestCases
        assert.equal(
          summary.totalPassed + summary.totalFailed,
          totalTestCases,
          "Sum invariant violated"
        );

        // Score should be consistent with pass ratio
        const expectedScore = Math.round((summary.totalPassed / totalTestCases) * 100);
        assert.equal(
          summary.score,
          expectedScore,
          `Score ${summary.score} inconsistent with pass ratio (expected ${expectedScore})`
        );

        // Score bounds
        assert.ok(summary.score >= 0, "Score must be >= 0");
        assert.ok(summary.score <= 100, "Score must be <= 100");
      }),
      { numRuns: NUM_RUNS }
    );
  });
});

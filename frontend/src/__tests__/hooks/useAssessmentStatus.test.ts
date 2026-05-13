/**
 * Unit tests for useAssessmentStatus hook — pure utility functions.
 *
 * Tests the exported helper functions: isSummaryEvent, isProgressEvent,
 * applyProgressEvent, countCompleted, and TIMEOUT_MS constant.
 *
 * Requirements: 6.3, 6.5
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isSummaryEvent,
  isProgressEvent,
  applyProgressEvent,
  countCompleted,
  TIMEOUT_MS,
  type TestCaseResult,
  type AssessmentProgress,
} from "../../hooks/assessmentStatusUtils.ts";

describe("useAssessmentStatus — isSummaryEvent", () => {
  it("returns true for a valid summary payload", () => {
    const payload = {
      assessmentId: "a1",
      totalPassed: 5,
      totalFailed: 2,
      score: 71,
      overallStatus: "COMPLETED",
    };
    assert.equal(isSummaryEvent(payload), true);
  });

  it("returns false for a progress payload", () => {
    const payload = {
      assessmentId: "a1",
      testCaseIndex: 0,
      totalTestCases: 5,
      status: "passed",
      executionTimeMs: 120,
    };
    assert.equal(isSummaryEvent(payload), false);
  });

  it("returns false for null", () => {
    assert.equal(isSummaryEvent(null), false);
  });

  it("returns false for non-object", () => {
    assert.equal(isSummaryEvent("string"), false);
    assert.equal(isSummaryEvent(42), false);
  });

  it("returns false for object missing overallStatus", () => {
    assert.equal(isSummaryEvent({ totalPassed: 5 }), false);
  });

  it("returns false for object missing totalPassed", () => {
    assert.equal(isSummaryEvent({ overallStatus: "COMPLETED" }), false);
  });
});

describe("useAssessmentStatus — isProgressEvent", () => {
  it("returns true for a valid progress payload", () => {
    const payload = {
      assessmentId: "a1",
      testCaseIndex: 2,
      totalTestCases: 10,
      status: "running",
      executionTimeMs: 50,
    };
    assert.equal(isProgressEvent(payload), true);
  });

  it("returns false for a summary payload", () => {
    const payload = {
      assessmentId: "a1",
      totalPassed: 5,
      totalFailed: 2,
      score: 71,
      overallStatus: "COMPLETED",
    };
    assert.equal(isProgressEvent(payload), false);
  });

  it("returns false for null", () => {
    assert.equal(isProgressEvent(null), false);
  });

  it("returns false for non-object", () => {
    assert.equal(isProgressEvent(undefined), false);
  });
});

describe("useAssessmentStatus — applyProgressEvent", () => {
  it("initializes array with pending entries when current is empty", () => {
    const progress: AssessmentProgress = {
      assessmentId: "a1",
      testCaseIndex: 0,
      totalTestCases: 3,
      status: "passed",
      executionTimeMs: 100,
    };

    const result = applyProgressEvent([], progress);

    assert.equal(result.length, 3);
    assert.deepEqual(result[0], {
      index: 0,
      status: "passed",
      executionTimeMs: 100,
      errorOutput: undefined,
    });
    assert.equal(result[1].status, "pending");
    assert.equal(result[2].status, "pending");
  });

  it("updates a specific test case index without affecting others", () => {
    const initial: TestCaseResult[] = [
      { index: 0, status: "passed", executionTimeMs: 50 },
      { index: 1, status: "pending", executionTimeMs: 0 },
      { index: 2, status: "pending", executionTimeMs: 0 },
    ];

    const progress: AssessmentProgress = {
      assessmentId: "a1",
      testCaseIndex: 1,
      totalTestCases: 3,
      status: "failed",
      executionTimeMs: 200,
      errorOutput: "assertion error",
    };

    const result = applyProgressEvent(initial, progress);

    assert.equal(result[0].status, "passed");
    assert.deepEqual(result[1], {
      index: 1,
      status: "failed",
      executionTimeMs: 200,
      errorOutput: "assertion error",
    });
    assert.equal(result[2].status, "pending");
  });

  it("does not mutate the original array", () => {
    const initial: TestCaseResult[] = [
      { index: 0, status: "pending", executionTimeMs: 0 },
    ];

    const progress: AssessmentProgress = {
      assessmentId: "a1",
      testCaseIndex: 0,
      totalTestCases: 1,
      status: "passed",
      executionTimeMs: 75,
    };

    const result = applyProgressEvent(initial, progress);

    assert.equal(initial[0].status, "pending");
    assert.equal(result[0].status, "passed");
  });

  it("expands array when totalTestCases increases", () => {
    const initial: TestCaseResult[] = [
      { index: 0, status: "passed", executionTimeMs: 50 },
    ];

    const progress: AssessmentProgress = {
      assessmentId: "a1",
      testCaseIndex: 2,
      totalTestCases: 4,
      status: "running",
      executionTimeMs: 10,
    };

    const result = applyProgressEvent(initial, progress);

    assert.equal(result.length, 4);
    assert.equal(result[0].status, "passed");
    assert.equal(result[1].status, "pending");
    assert.equal(result[2].status, "running");
    assert.equal(result[3].status, "pending");
  });
});

describe("useAssessmentStatus — countCompleted", () => {
  it("returns 0 for empty array", () => {
    assert.equal(countCompleted([]), 0);
  });

  it("returns 0 when all are pending", () => {
    const cases: TestCaseResult[] = [
      { index: 0, status: "pending", executionTimeMs: 0 },
      { index: 1, status: "pending", executionTimeMs: 0 },
    ];
    assert.equal(countCompleted(cases), 0);
  });

  it("counts passed and failed but not running or pending", () => {
    const cases: TestCaseResult[] = [
      { index: 0, status: "passed", executionTimeMs: 50 },
      { index: 1, status: "failed", executionTimeMs: 100 },
      { index: 2, status: "running", executionTimeMs: 0 },
      { index: 3, status: "pending", executionTimeMs: 0 },
    ];
    assert.equal(countCompleted(cases), 2);
  });

  it("counts all when all are completed", () => {
    const cases: TestCaseResult[] = [
      { index: 0, status: "passed", executionTimeMs: 50 },
      { index: 1, status: "passed", executionTimeMs: 60 },
      { index: 2, status: "failed", executionTimeMs: 70 },
    ];
    assert.equal(countCompleted(cases), 3);
  });
});

describe("useAssessmentStatus — TIMEOUT_MS constant", () => {
  it("equals 60000ms (60 seconds)", () => {
    assert.equal(TIMEOUT_MS, 60_000);
  });
});

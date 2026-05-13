/**
 * Pure utility functions for useAssessmentStatus hook.
 * Extracted for testability without React/WebSocket dependencies.
 *
 * Requirements: 6.3, 6.5
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TestCaseStatus = "passed" | "failed" | "running" | "pending";

export interface TestCaseResult {
  index: number;
  status: TestCaseStatus;
  executionTimeMs: number;
  errorOutput?: string;
}

export interface AssessmentProgress {
  assessmentId: string;
  testCaseIndex: number;
  totalTestCases: number;
  status: TestCaseStatus;
  executionTimeMs: number;
  errorOutput?: string;
}

export interface AssessmentSummary {
  assessmentId: string;
  totalPassed: number;
  totalFailed: number;
  score: number;
  overallStatus: "COMPLETED" | "FAILED" | "TIMEOUT";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Timeout duration in milliseconds — 60 seconds per Requirement 6.5 */
export const TIMEOUT_MS = 60_000;

// ---------------------------------------------------------------------------
// Pure utility functions
// ---------------------------------------------------------------------------

/**
 * Determines whether a parsed message payload is a summary event.
 * A summary event contains `overallStatus` and `totalPassed` fields.
 */
export function isSummaryEvent(payload: unknown): payload is AssessmentSummary {
  if (typeof payload !== "object" || payload === null) return false;
  const obj = payload as Record<string, unknown>;
  return "overallStatus" in obj && "totalPassed" in obj;
}

/**
 * Determines whether a parsed message payload is a progress event.
 * A progress event contains `testCaseIndex` field.
 */
export function isProgressEvent(payload: unknown): payload is AssessmentProgress {
  if (typeof payload !== "object" || payload === null) return false;
  return "testCaseIndex" in payload;
}

/**
 * Applies a progress event to the current test case array, returning a new array.
 * Ensures the array is sized to `totalTestCases` and updates the specific index.
 */
export function applyProgressEvent(
  current: TestCaseResult[],
  progress: AssessmentProgress
): TestCaseResult[] {
  const updated = [...current];

  // Ensure array is large enough
  while (updated.length < progress.totalTestCases) {
    updated.push({
      index: updated.length,
      status: "pending",
      executionTimeMs: 0,
    });
  }

  // Update the specific test case
  updated[progress.testCaseIndex] = {
    index: progress.testCaseIndex,
    status: progress.status,
    executionTimeMs: progress.executionTimeMs,
    errorOutput: progress.errorOutput,
  };

  return updated;
}

/**
 * Counts the number of completed (passed or failed) test cases.
 */
export function countCompleted(testCases: TestCaseResult[]): number {
  return testCases.filter(
    (tc) => tc.status === "passed" || tc.status === "failed"
  ).length;
}

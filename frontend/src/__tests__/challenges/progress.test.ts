/**
 * Unit tests for lib/challenges/progress.ts â€” computeProgress
 * Requirements: 3.3
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeProgress,
  type SubmissionRecord,
} from "../../lib/challenges/progress.ts";

describe("computeProgress", () => {
  const today = new Date("2024-06-15T12:00:00Z");

  it("returns zeros for empty submissions", () => {
    const result = computeProgress([], today);
    assert.deepEqual(result, {
      totalSolved: 0,
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      streak: 0,
    });
  });

  it("counts unique solved challenges", () => {
    const submissions: SubmissionRecord[] = [
      { challengeId: "a", difficulty: "EASY", verdict: "ACCEPTED", submittedAt: "2024-06-15T10:00:00Z" },
      { challengeId: "a", difficulty: "EASY", verdict: "ACCEPTED", submittedAt: "2024-06-15T11:00:00Z" }, // duplicate
      { challengeId: "b", difficulty: "MEDIUM", verdict: "ACCEPTED", submittedAt: "2024-06-14T10:00:00Z" },
    ];
    const result = computeProgress(submissions, today);
    assert.equal(result.totalSolved, 2);
    assert.deepEqual(result.byDifficulty, { easy: 1, medium: 1, hard: 0 });
  });

  it("ignores non-Accepted verdicts for solved count", () => {
    const submissions: SubmissionRecord[] = [
      { challengeId: "a", difficulty: "EASY", verdict: "WRONG_ANSWER", submittedAt: "2024-06-15T10:00:00Z" },
      { challengeId: "b", difficulty: "HARD", verdict: "TLE", submittedAt: "2024-06-15T11:00:00Z" },
    ];
    const result = computeProgress(submissions, today);
    assert.equal(result.totalSolved, 0);
    assert.deepEqual(result.byDifficulty, { easy: 0, medium: 0, hard: 0 });
  });

  it("computes streak of consecutive days", () => {
    const submissions: SubmissionRecord[] = [
      { challengeId: "a", difficulty: "EASY", verdict: "ACCEPTED", submittedAt: "2024-06-15T10:00:00Z" }, // today
      { challengeId: "b", difficulty: "MEDIUM", verdict: "ACCEPTED", submittedAt: "2024-06-14T10:00:00Z" }, // yesterday
      { challengeId: "c", difficulty: "HARD", verdict: "ACCEPTED", submittedAt: "2024-06-13T10:00:00Z" }, // 2 days ago
      // gap on June 12
      { challengeId: "d", difficulty: "EASY", verdict: "ACCEPTED", submittedAt: "2024-06-11T10:00:00Z" },
    ];
    const result = computeProgress(submissions, today);
    assert.equal(result.streak, 3); // June 15, 14, 13
  });

  it("streak is 0 when no accepted submission today", () => {
    const submissions: SubmissionRecord[] = [
      { challengeId: "a", difficulty: "EASY", verdict: "ACCEPTED", submittedAt: "2024-06-14T10:00:00Z" },
    ];
    const result = computeProgress(submissions, today);
    assert.equal(result.streak, 0);
  });

  it("streak counts only accepted submissions", () => {
    const submissions: SubmissionRecord[] = [
      { challengeId: "a", difficulty: "EASY", verdict: "ACCEPTED", submittedAt: "2024-06-15T10:00:00Z" },
      { challengeId: "b", difficulty: "MEDIUM", verdict: "WRONG_ANSWER", submittedAt: "2024-06-14T10:00:00Z" },
    ];
    const result = computeProgress(submissions, today);
    assert.equal(result.streak, 1); // only today
  });

  it("breaks down by all difficulty levels", () => {
    const submissions: SubmissionRecord[] = [
      { challengeId: "a", difficulty: "EASY", verdict: "ACCEPTED", submittedAt: "2024-06-15T10:00:00Z" },
      { challengeId: "b", difficulty: "EASY", verdict: "ACCEPTED", submittedAt: "2024-06-15T10:00:00Z" },
      { challengeId: "c", difficulty: "MEDIUM", verdict: "ACCEPTED", submittedAt: "2024-06-15T10:00:00Z" },
      { challengeId: "d", difficulty: "HARD", verdict: "ACCEPTED", submittedAt: "2024-06-15T10:00:00Z" },
      { challengeId: "e", difficulty: "HARD", verdict: "ACCEPTED", submittedAt: "2024-06-15T10:00:00Z" },
    ];
    const result = computeProgress(submissions, today);
    assert.equal(result.totalSolved, 5);
    assert.deepEqual(result.byDifficulty, { easy: 2, medium: 1, hard: 2 });
  });

  it("rank is undefined (not computed locally)", () => {
    const submissions: SubmissionRecord[] = [
      { challengeId: "a", difficulty: "EASY", verdict: "ACCEPTED", submittedAt: "2024-06-15T10:00:00Z" },
    ];
    const result = computeProgress(submissions, today);
    assert.equal(result.rank, undefined);
  });
});

/**
 * Unit tests for lib/leaderboard/merge.ts â€” mergeLeaderboard
 * Requirements: 5.3
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeLeaderboard,
  type LeaderboardEntry,
} from "../../lib/leaderboard/merge.ts";

function makeEntry(
  overrides: Partial<LeaderboardEntry> & { userId: string; rank: number },
): LeaderboardEntry {
  return {
    username: `user_${overrides.userId}`,
    totalSolved: 10,
    acceptanceRate: 0.8,
    avgExecutionTimeMs: 150,
    lastActive: "2024-01-01T00:00:00Z",
    period: "weekly",
    ...overrides,
  };
}

describe("mergeLeaderboard", () => {
  it("returns empty array when both inputs are empty", () => {
    const result = mergeLeaderboard([], []);
    assert.deepEqual(result, []);
  });

  it("returns sorted copy of old entries when new is empty", () => {
    const old = [
      makeEntry({ userId: "a", rank: 3 }),
      makeEntry({ userId: "b", rank: 1 }),
    ];
    const result = mergeLeaderboard(old, []);
    assert.equal(result.length, 2);
    assert.equal(result[0].userId, "b");
    assert.equal(result[1].userId, "a");
  });

  it("returns sorted copy of new entries when old is empty", () => {
    const newEntries = [
      makeEntry({ userId: "x", rank: 5 }),
      makeEntry({ userId: "y", rank: 2 }),
    ];
    const result = mergeLeaderboard([], newEntries);
    assert.equal(result.length, 2);
    assert.equal(result[0].userId, "y");
    assert.equal(result[1].userId, "x");
  });

  it("deduplicates by userId with new entry winning", () => {
    const old = [makeEntry({ userId: "a", rank: 1, totalSolved: 5 })];
    const newEntries = [makeEntry({ userId: "a", rank: 2, totalSolved: 10 })];

    const result = mergeLeaderboard(old, newEntries);
    assert.equal(result.length, 1);
    assert.equal(result[0].userId, "a");
    assert.equal(result[0].totalSolved, 10);
    assert.equal(result[0].rank, 2);
  });

  it("merges entries from both arrays and sorts by rank ascending", () => {
    const old = [
      makeEntry({ userId: "a", rank: 3 }),
      makeEntry({ userId: "b", rank: 1 }),
    ];
    const newEntries = [
      makeEntry({ userId: "c", rank: 2 }),
      makeEntry({ userId: "d", rank: 4 }),
    ];

    const result = mergeLeaderboard(old, newEntries);
    assert.equal(result.length, 4);
    assert.deepEqual(
      result.map((e) => e.rank),
      [1, 2, 3, 4],
    );
  });

  it("does not mutate input arrays", () => {
    const old = [makeEntry({ userId: "a", rank: 2 })];
    const newEntries = [makeEntry({ userId: "b", rank: 1 })];
    const oldCopy = [...old];
    const newCopy = [...newEntries];

    mergeLeaderboard(old, newEntries);

    assert.deepEqual(old, oldCopy);
    assert.deepEqual(newEntries, newCopy);
  });

  it("handles multiple duplicates correctly", () => {
    const old = [
      makeEntry({ userId: "a", rank: 1, totalSolved: 5 }),
      makeEntry({ userId: "b", rank: 3, totalSolved: 4 }),
      makeEntry({ userId: "c", rank: 5, totalSolved: 3 }),
    ];
    const newEntries = [
      makeEntry({ userId: "a", rank: 4, totalSolved: 6 }),
      makeEntry({ userId: "c", rank: 1, totalSolved: 7 }),
    ];

    const result = mergeLeaderboard(old, newEntries);
    assert.equal(result.length, 3);
    // c has rank 1 (from new), b has rank 3 (from old), a has rank 4 (from new)
    assert.equal(result[0].userId, "c");
    assert.equal(result[0].totalSolved, 7);
    assert.equal(result[1].userId, "b");
    assert.equal(result[1].totalSolved, 4);
    assert.equal(result[2].userId, "a");
    assert.equal(result[2].totalSolved, 6);
  });

  it("preserves topics array in merged entries", () => {
    const old = [
      makeEntry({ userId: "a", rank: 1, topics: ["arrays", "strings"] }),
    ];
    const newEntries = [
      makeEntry({ userId: "b", rank: 2, topics: ["dp", "graphs"] }),
    ];

    const result = mergeLeaderboard(old, newEntries);
    assert.deepEqual(result[0].topics, ["arrays", "strings"]);
    assert.deepEqual(result[1].topics, ["dp", "graphs"]);
  });
});

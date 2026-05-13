/**
 * Unit tests for lib/leaderboard/filter.ts â€” filterLeaderboard
 * Requirements: 5.4
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterLeaderboard, type LeaderboardFilter } from "../../lib/leaderboard/filter.ts";
import type { LeaderboardEntry } from "../../lib/leaderboard/merge.ts";

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

describe("filterLeaderboard", () => {
  const entries: LeaderboardEntry[] = [
    makeEntry({ userId: "a", rank: 1, period: "weekly", topics: ["arrays", "dp"] }),
    makeEntry({ userId: "b", rank: 2, period: "monthly", topics: ["graphs"] }),
    makeEntry({ userId: "c", rank: 3, period: "weekly", topics: ["dp", "strings"] }),
    makeEntry({ userId: "d", rank: 4, period: "all-time", topics: ["arrays"] }),
    makeEntry({ userId: "e", rank: 5, period: "weekly" }), // no topics
  ];

  it("returns empty array when input is empty", () => {
    const result = filterLeaderboard([], { period: "weekly" });
    assert.deepEqual(result, []);
  });

  it("filters by period only (weekly)", () => {
    const result = filterLeaderboard(entries, { period: "weekly" });
    assert.equal(result.length, 3);
    assert.deepEqual(
      result.map((e) => e.userId),
      ["a", "c", "e"],
    );
  });

  it("filters by period only (monthly)", () => {
    const result = filterLeaderboard(entries, { period: "monthly" });
    assert.equal(result.length, 1);
    assert.equal(result[0].userId, "b");
  });

  it("filters by period only (all-time)", () => {
    const result = filterLeaderboard(entries, { period: "all-time" });
    assert.equal(result.length, 1);
    assert.equal(result[0].userId, "d");
  });

  it("filters by period and topic together", () => {
    const filter: LeaderboardFilter = { period: "weekly", topic: "dp" };
    const result = filterLeaderboard(entries, filter);
    assert.equal(result.length, 2);
    assert.deepEqual(
      result.map((e) => e.userId),
      ["a", "c"],
    );
  });

  it("excludes entries without topics array when topic filter is active", () => {
    const filter: LeaderboardFilter = { period: "weekly", topic: "arrays" };
    const result = filterLeaderboard(entries, filter);
    // Only "a" has period=weekly AND topics includes "arrays"
    // "e" has period=weekly but no topics array
    assert.equal(result.length, 1);
    assert.equal(result[0].userId, "a");
  });

  it("returns empty when no entries match the topic", () => {
    const filter: LeaderboardFilter = { period: "weekly", topic: "nonexistent" };
    const result = filterLeaderboard(entries, filter);
    assert.deepEqual(result, []);
  });

  it("topic matching is case-sensitive", () => {
    const filter: LeaderboardFilter = { period: "weekly", topic: "Arrays" };
    const result = filterLeaderboard(entries, filter);
    // "arrays" !== "Arrays" â€” case-sensitive
    assert.deepEqual(result, []);
  });

  it("does not mutate input array", () => {
    const input = [
      makeEntry({ userId: "x", rank: 1, period: "weekly", topics: ["dp"] }),
    ];
    const copy = [...input];

    filterLeaderboard(input, { period: "weekly", topic: "dp" });
    assert.deepEqual(input, copy);
  });
});

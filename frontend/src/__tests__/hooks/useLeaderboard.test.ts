/**
 * Unit tests for useLeaderboard hook — pure utility functions.
 *
 * Tests the exported applyRankChange and matchesContext functions
 * which implement rank-change event handling and context filtering.
 *
 * Requirements: 7.3
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Inline the pure utility functions from useLeaderboard for testability
// (avoids importing the hook file which has React/WebSocket dependencies)
// ---------------------------------------------------------------------------

interface RankChangeEvent {
  candidateId: string;
  newRank: number;
  previousRank: number;
  score: number;
  assessmentId: string;
}

interface LeaderboardEntry {
  candidateId: string;
  rank: number;
  score: number;
  transition: "up" | "down" | "new" | "none";
  transitionAt: number;
}

function applyRankChange(
  entries: LeaderboardEntry[],
  event: RankChangeEvent
): LeaderboardEntry[] {
  const now = Date.now();
  const existingIndex = entries.findIndex((e) => e.candidateId === event.candidateId);

  let updated: LeaderboardEntry[];

  if (existingIndex >= 0) {
    const transition: LeaderboardEntry["transition"] =
      event.newRank < event.previousRank ? "up" : event.newRank > event.previousRank ? "down" : "none";

    updated = entries.map((entry, idx) =>
      idx === existingIndex
        ? { ...entry, rank: event.newRank, score: event.score, transition, transitionAt: now }
        : entry
    );
  } else {
    const newEntry: LeaderboardEntry = {
      candidateId: event.candidateId,
      rank: event.newRank,
      score: event.score,
      transition: "new",
      transitionAt: now,
    };
    updated = [...entries, newEntry];
  }

  updated.sort((a, b) => a.rank - b.rank);
  return updated;
}

function matchesContext(event: RankChangeEvent, assessmentId: string | null): boolean {
  if (!assessmentId) return true;
  return event.assessmentId === assessmentId;
}

// ---------------------------------------------------------------------------
// applyRankChange tests
// ---------------------------------------------------------------------------

describe("applyRankChange", () => {
  it("adds a new candidate to an empty leaderboard", () => {
    const event: RankChangeEvent = {
      candidateId: "c1",
      newRank: 1,
      previousRank: 0,
      score: 95,
      assessmentId: "a1",
    };

    const result = applyRankChange([], event);

    assert.equal(result.length, 1);
    assert.equal(result[0].candidateId, "c1");
    assert.equal(result[0].rank, 1);
    assert.equal(result[0].score, 95);
    assert.equal(result[0].transition, "new");
  });

  it("updates an existing candidate with rank improvement (up transition)", () => {
    const entries: LeaderboardEntry[] = [
      { candidateId: "c1", rank: 1, score: 90, transition: "none", transitionAt: 0 },
      { candidateId: "c2", rank: 2, score: 80, transition: "none", transitionAt: 0 },
    ];

    const event: RankChangeEvent = {
      candidateId: "c2",
      newRank: 1,
      previousRank: 2,
      score: 95,
      assessmentId: "a1",
    };

    const result = applyRankChange(entries, event);

    const c2 = result.find((e) => e.candidateId === "c2");
    assert.equal(c2?.rank, 1);
    assert.equal(c2?.score, 95);
    assert.equal(c2?.transition, "up");
  });

  it("updates an existing candidate with rank drop (down transition)", () => {
    const entries: LeaderboardEntry[] = [
      { candidateId: "c1", rank: 1, score: 90, transition: "none", transitionAt: 0 },
      { candidateId: "c2", rank: 2, score: 80, transition: "none", transitionAt: 0 },
    ];

    const event: RankChangeEvent = {
      candidateId: "c1",
      newRank: 3,
      previousRank: 1,
      score: 70,
      assessmentId: "a1",
    };

    const result = applyRankChange(entries, event);

    const c1 = result.find((e) => e.candidateId === "c1");
    assert.equal(c1?.rank, 3);
    assert.equal(c1?.score, 70);
    assert.equal(c1?.transition, "down");
  });

  it("sets transition to none when rank does not change", () => {
    const entries: LeaderboardEntry[] = [
      { candidateId: "c1", rank: 1, score: 90, transition: "none", transitionAt: 0 },
    ];

    const event: RankChangeEvent = {
      candidateId: "c1",
      newRank: 1,
      previousRank: 1,
      score: 92,
      assessmentId: "a1",
    };

    const result = applyRankChange(entries, event);

    assert.equal(result[0].transition, "none");
    assert.equal(result[0].score, 92);
  });

  it("sorts entries by rank ascending after update", () => {
    const entries: LeaderboardEntry[] = [
      { candidateId: "c1", rank: 1, score: 90, transition: "none", transitionAt: 0 },
      { candidateId: "c2", rank: 3, score: 80, transition: "none", transitionAt: 0 },
      { candidateId: "c3", rank: 5, score: 70, transition: "none", transitionAt: 0 },
    ];

    const event: RankChangeEvent = {
      candidateId: "c3",
      newRank: 2,
      previousRank: 5,
      score: 99,
      assessmentId: "a1",
    };

    const result = applyRankChange(entries, event);

    // Should be sorted: c1 (rank 1), c3 (rank 2), c2 (rank 3)
    assert.equal(result[0].candidateId, "c1");
    assert.equal(result[0].rank, 1);
    assert.equal(result[1].candidateId, "c3");
    assert.equal(result[1].rank, 2);
    assert.equal(result[2].candidateId, "c2");
    assert.equal(result[2].rank, 3);
  });

  it("does not mutate the original entries array", () => {
    const entries: LeaderboardEntry[] = [
      { candidateId: "c1", rank: 1, score: 90, transition: "none", transitionAt: 0 },
    ];
    const original = [...entries];

    applyRankChange(entries, {
      candidateId: "c2",
      newRank: 2,
      previousRank: 0,
      score: 80,
      assessmentId: "a1",
    });

    assert.deepEqual(entries, original);
  });
});

// ---------------------------------------------------------------------------
// matchesContext tests
// ---------------------------------------------------------------------------

describe("matchesContext", () => {
  it("returns true when assessmentId is null (no filter)", () => {
    const event: RankChangeEvent = {
      candidateId: "c1",
      newRank: 1,
      previousRank: 2,
      score: 90,
      assessmentId: "a1",
    };

    assert.equal(matchesContext(event, null), true);
  });

  it("returns true when event assessmentId matches the filter", () => {
    const event: RankChangeEvent = {
      candidateId: "c1",
      newRank: 1,
      previousRank: 2,
      score: 90,
      assessmentId: "a1",
    };

    assert.equal(matchesContext(event, "a1"), true);
  });

  it("returns false when event assessmentId does not match the filter", () => {
    const event: RankChangeEvent = {
      candidateId: "c1",
      newRank: 1,
      previousRank: 2,
      score: 90,
      assessmentId: "a1",
    };

    assert.equal(matchesContext(event, "a2"), false);
  });
});

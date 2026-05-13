/**
 * Unit tests for lib/challenges/filter.ts - filterChallenges
 * Requirements: 3.2
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterChallenges, type ChallengeFilter } from "../../lib/challenges/filter.ts";
import type { PublicChallenge } from "../../types/domain.ts";

const challenges: PublicChallenge[] = [
  {
    id: "1",
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "EASY",
    languages: ["Java", "TypeScript"],
    topics: ["Array", "Hash Table"],
    acceptanceRate: 0.75,
    totalSubmissions: 1000,
    solved: true,
  },
  {
    id: "2",
    slug: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "MEDIUM",
    languages: ["Java"],
    topics: ["Array", "Sorting"],
    acceptanceRate: 0.55,
    totalSubmissions: 800,
    solved: false,
  },
  {
    id: "3",
    slug: "binary-tree-max-path",
    title: "Binary Tree Maximum Path Sum",
    difficulty: "HARD",
    languages: ["TypeScript", "SQL"],
    topics: ["Tree", "DFS"],
    acceptanceRate: 0.35,
    totalSubmissions: 500,
    solved: false,
  },
];

describe("filterChallenges", () => {
  it("returns all challenges when filter is empty", () => {
    const result = filterChallenges(challenges, {});
    assert.equal(result.length, 3);
  });

  it("filters by difficulty", () => {
    const result = filterChallenges(challenges, { difficulty: "EASY" });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "1");
  });

  it("filters by language (case-insensitive)", () => {
    const result = filterChallenges(challenges, { language: "typescript" });
    assert.equal(result.length, 2);
    assert.deepEqual(
      result.map((c) => c.id),
      ["1", "3"]
    );
  });

  it("filters by topic (case-insensitive)", () => {
    const result = filterChallenges(challenges, { topic: "array" });
    assert.equal(result.length, 2);
    assert.deepEqual(
      result.map((c) => c.id),
      ["1", "2"]
    );
  });

  it("filters by solved status", () => {
    const result = filterChallenges(challenges, { solved: true });
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "1");
  });

  it("combines multiple filters with AND logic", () => {
    const filter: ChallengeFilter = {
      difficulty: "MEDIUM",
      language: "Java",
      solved: false,
    };
    const result = filterChallenges(challenges, filter);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "2");
  });

  it("returns empty array when no challenges match", () => {
    const result = filterChallenges(challenges, { difficulty: "HARD", solved: true });
    assert.equal(result.length, 0);
  });

  it("returns empty array for empty input list", () => {
    const result = filterChallenges([], { difficulty: "EASY" });
    assert.equal(result.length, 0);
  });
});

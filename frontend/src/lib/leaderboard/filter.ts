import type { LeaderboardEntry } from "./merge";

/**
 * Filter criteria for the leaderboard.
 *
 * - `period`: required — exact match on entry.period
 * - `topic`: optional — if provided, only entries whose `topics` array
 *   contains this topic (case-sensitive) are included
 *
 * Requirements: 5.4
 */
export type LeaderboardFilter = {
  period: "weekly" | "monthly" | "all-time";
  topic?: string;
};

/**
 * Filter leaderboard entries by period and optionally by topic.
 *
 * - Period filter: exact match on `entry.period`.
 * - Topic filter: if `filter.topic` is provided, only entries that have
 *   that topic in their `topics` array are included. Entries without a
 *   `topics` array are excluded when a topic filter is active.
 *
 * Pure function — no side effects. Returns a new array.
 *
 * Requirements: 5.4
 */
export function filterLeaderboard(
  entries: LeaderboardEntry[],
  filter: LeaderboardFilter,
): LeaderboardEntry[] {
  return entries.filter((entry) => {
    // Period must match exactly
    if (entry.period !== filter.period) {
      return false;
    }

    // If topic filter is provided, entry must have that topic
    if (filter.topic !== undefined) {
      if (!entry.topics || !entry.topics.includes(filter.topic)) {
        return false;
      }
    }

    return true;
  });
}

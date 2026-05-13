/**
 * Leaderboard entry representing a candidate's ranking data.
 *
 * Requirements: 5.2, 5.3, 5.4
 */
export type LeaderboardEntry = {
  userId: string;
  username: string;
  avatarUrl?: string;
  rank: number;
  totalSolved: number;
  acceptanceRate: number;
  avgExecutionTimeMs: number;
  lastActive: string;
  period: "weekly" | "monthly" | "all-time";
  topics?: string[];
};

/**
 * Merge two leaderboard snapshots into a single deduplicated, sorted list.
 *
 * - Deduplication: if the same `userId` appears in both `oldEntries` and
 *   `newEntries`, the entry from `newEntries` wins (fresher data).
 * - Sorting: result is sorted by `rank` ascending.
 * - Immutability: returns a new array; inputs are not mutated.
 *
 * Pure function — no side effects.
 *
 * Requirements: 5.3
 */
export function mergeLeaderboard(
  oldEntries: LeaderboardEntry[],
  newEntries: LeaderboardEntry[],
): LeaderboardEntry[] {
  const merged = new Map<string, LeaderboardEntry>();

  // Add old entries first
  for (const entry of oldEntries) {
    merged.set(entry.userId, entry);
  }

  // New entries overwrite old ones (new wins on dedup)
  for (const entry of newEntries) {
    merged.set(entry.userId, entry);
  }

  // Sort by rank ascending and return new array
  return Array.from(merged.values()).sort((a, b) => a.rank - b.rank);
}

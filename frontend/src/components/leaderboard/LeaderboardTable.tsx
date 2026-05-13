"use client";

import type { LeaderboardEntry } from "@/lib/leaderboard";
import { LeaderboardRow } from "./LeaderboardRow";

export interface LeaderboardTableProps {
  /** Array of leaderboard entries to display */
  entries: LeaderboardEntry[];
  /** Current user's ID — their row will be highlighted */
  currentUserId?: string;
  /** Set of user IDs whose rank has changed (triggers pulse animation) */
  rankChangedUserIds?: Set<string>;
  /** Additional CSS class */
  className?: string;
}

/**
 * LeaderboardTable renders an accessible table of leaderboard entries.
 *
 * Columns: Rank, User, Solved, Acceptance, Avg Time, Last Active
 *
 * Features:
 * - Highlights the current user's row with accent background
 * - Applies `.dh-rank-pulse` animation on rows with rank changes
 * - Proper semantic HTML: <table>/<thead>/<tbody>/<th>/<td>
 * - Responsive: hides less-critical columns on mobile
 *
 * Requirements: 5.2, 5.3
 */
export function LeaderboardTable({
  entries,
  currentUserId,
  rankChangedUserIds,
  className = "",
}: LeaderboardTableProps) {
  return (
    <div
      className={`dh-leaderboard__wrapper ${className}`}
      data-testid="leaderboard-table"
    >
      <table className="dh-leaderboard__table" role="table">
        <thead className="dh-leaderboard__head">
          <tr>
            <th className="dh-leaderboard__th" scope="col">
              Rank
            </th>
            <th className="dh-leaderboard__th" scope="col">
              User
            </th>
            <th className="dh-leaderboard__th dh-leaderboard__th--numeric" scope="col">
              Solved
            </th>
            <th
              className="dh-leaderboard__th dh-leaderboard__th--numeric dh-leaderboard__th--hide-mobile"
              scope="col"
            >
              Acceptance
            </th>
            <th
              className="dh-leaderboard__th dh-leaderboard__th--numeric dh-leaderboard__th--hide-mobile"
              scope="col"
            >
              Avg Time
            </th>
            <th
              className="dh-leaderboard__th dh-leaderboard__th--hide-mobile"
              scope="col"
            >
              Last Active
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isCurrentUser={currentUserId === entry.userId}
              rankChanged={rankChangedUserIds?.has(entry.userId) ?? false}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

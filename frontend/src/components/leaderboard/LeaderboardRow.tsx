"use client";

import { Avatar } from "@/components/ui/primitives";
import type { LeaderboardEntry } from "@/lib/leaderboard";

export interface LeaderboardRowProps {
  /** Leaderboard entry data */
  entry: LeaderboardEntry;
  /** Whether this row belongs to the current user */
  isCurrentUser?: boolean;
  /** Whether the rank has changed (triggers pulse animation) */
  rankChanged?: boolean;
}

/**
 * Formats a date string into a human-readable relative time.
 * E.g. "2 hours ago", "3 days ago", "just now"
 */
function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (Number.isNaN(then)) {
    return "Unknown";
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/**
 * LeaderboardRow renders a single row in the leaderboard table.
 *
 * Displays: rank, avatar + username, totalSolved, acceptanceRate%,
 * avgExecutionTimeMs, and lastActive as relative time.
 *
 * When `rankChanged` is true, applies `.dh-rank-pulse` CSS class
 * which triggers a 2s scale + glow keyframe animation.
 *
 * Requirements: 5.2, 5.3
 */
export function LeaderboardRow({
  entry,
  isCurrentUser = false,
  rankChanged = false,
}: LeaderboardRowProps) {
  const rowClasses = [
    "dh-leaderboard__row",
    isCurrentUser && "dh-leaderboard__row--current-user",
    rankChanged && "dh-rank-pulse",
  ]
    .filter(Boolean)
    .join(" ");

  const usernameClasses = [
    "dh-leaderboard__username",
    isCurrentUser && "dh-leaderboard__username--current",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <tr className={rowClasses} data-testid={`leaderboard-row-${entry.userId}`}>
      <td className="dh-leaderboard__td dh-leaderboard__td--rank">
        {entry.rank}
      </td>
      <td className="dh-leaderboard__td">
        <div className="dh-leaderboard__user-cell">
          <Avatar
            src={entry.avatarUrl}
            alt={entry.username}
            size="sm"
          />
          <span className={usernameClasses}>{entry.username}</span>
        </div>
      </td>
      <td className="dh-leaderboard__td dh-leaderboard__td--numeric">
        {entry.totalSolved}
      </td>
      <td className="dh-leaderboard__td dh-leaderboard__td--numeric dh-leaderboard__td--hide-mobile">
        {entry.acceptanceRate.toFixed(1)}%
      </td>
      <td className="dh-leaderboard__td dh-leaderboard__td--numeric dh-leaderboard__td--hide-mobile">
        {entry.avgExecutionTimeMs.toFixed(0)}ms
      </td>
      <td className="dh-leaderboard__td dh-leaderboard__last-active dh-leaderboard__td--hide-mobile">
        <time dateTime={entry.lastActive}>
          {formatRelativeTime(entry.lastActive)}
        </time>
      </td>
    </tr>
  );
}

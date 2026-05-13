"use client";

import "@/styles/components/staleness-badge.css";

export interface StalenessBadgeProps {
  /** Whether the data is stale */
  isStale: boolean;
  /** Last fetched timestamp (ms since epoch) */
  fetchedAt: number;
}

/**
 * StalenessBadge — Indicator shown when health data is older than threshold.
 *
 * Displays a warning badge with relative time since last successful fetch.
 *
 * Requirements: 7.6, 11.5
 */
export function StalenessBadge({ isStale, fetchedAt }: StalenessBadgeProps) {
  if (!isStale) return null;

  const agoText = formatAgo(fetchedAt);

  return (
    <span
      className="dh-staleness-badge"
      role="status"
      aria-live="polite"
      data-testid="staleness-badge"
    >
      <span className="dh-staleness-badge__icon" aria-hidden="true">⏱</span>
      <span className="dh-staleness-badge__text">
        Data stale — last updated {agoText}
      </span>
    </span>
  );
}

function formatAgo(fetchedAt: number): string {
  const diffMs = Date.now() - fetchedAt;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return `${Math.floor(diffSec / 3600)}h ago`;
}

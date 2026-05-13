"use client";

export interface CurrentUserBannerProps {
  /** User's current rank in the leaderboard */
  rank: number;
  /** Username to display */
  username: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * CurrentUserBanner — Sticky banner at the bottom showing the current user's rank.
 *
 * Only renders when the user is present in the leaderboard (parent controls visibility).
 * Displays a trophy emoji and the user's rank position.
 *
 * Uses --dh-* design tokens for styling.
 *
 * Requirements: 5.4
 */
export function CurrentUserBanner({
  rank,
  username,
  className = "",
}: CurrentUserBannerProps) {
  return (
    <div
      className={`dh-current-user-banner ${className}`}
      data-testid="current-user-banner"
      role="status"
      aria-live="polite"
      aria-label={`Your rank: number ${rank}`}
    >
      <span className="dh-current-user-banner__trophy" aria-hidden="true">
        🏆
      </span>
      <span className="dh-current-user-banner__text">
        Your rank: <strong>#{rank}</strong>
      </span>
      <span className="dh-current-user-banner__username">{username}</span>
    </div>
  );
}

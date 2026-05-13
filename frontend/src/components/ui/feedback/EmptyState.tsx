"use client";

import type { ReactNode } from "react";

export type EmptyStateIllustration =
  | "no-data"
  | "no-results"
  | "no-access"
  | "first-time";

export interface EmptyStateProps {
  illustration?: EmptyStateIllustration;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

const ILLUSTRATION_LABELS: Record<EmptyStateIllustration, string> = {
  "no-data": "No data available",
  "no-results": "No results found",
  "no-access": "Access restricted",
  "first-time": "Get started",
};

/**
 * SVG illustrations for each empty state type.
 * Simple, accessible inline SVGs using design tokens.
 */
function EmptyIllustration({ type }: { type: EmptyStateIllustration }) {
  const label = ILLUSTRATION_LABELS[type];

  return (
    <svg
      className={`dh-empty-state__illustration dh-empty-state__illustration--${type}`}
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      aria-label={label}
      role="img"
    >
      {type === "no-data" && (
        <>
          <rect x="20" y="30" width="80" height="60" rx="8" fill="var(--dh-color-bg-muted)" stroke="var(--dh-color-border-default)" strokeWidth="2" />
          <line x1="35" y1="50" x2="85" y2="50" stroke="var(--dh-color-border-strong)" strokeWidth="2" strokeLinecap="round" />
          <line x1="35" y1="60" x2="70" y2="60" stroke="var(--dh-color-border-default)" strokeWidth="2" strokeLinecap="round" />
          <line x1="35" y1="70" x2="75" y2="70" stroke="var(--dh-color-border-default)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {type === "no-results" && (
        <>
          <circle cx="55" cy="55" r="25" fill="var(--dh-color-bg-muted)" stroke="var(--dh-color-border-default)" strokeWidth="2" />
          <line x1="73" y1="73" x2="95" y2="95" stroke="var(--dh-color-border-strong)" strokeWidth="4" strokeLinecap="round" />
          <line x1="45" y1="55" x2="65" y2="55" stroke="var(--dh-color-fg-muted)" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {type === "no-access" && (
        <>
          <rect x="35" y="45" width="50" height="40" rx="6" fill="var(--dh-color-bg-muted)" stroke="var(--dh-color-border-default)" strokeWidth="2" />
          <path d="M45 45V35a15 15 0 0 1 30 0v10" fill="none" stroke="var(--dh-color-border-strong)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="65" r="5" fill="var(--dh-color-fg-muted)" />
        </>
      )}
      {type === "first-time" && (
        <>
          <circle cx="60" cy="55" r="30" fill="var(--dh-color-brand-soft)" stroke="var(--dh-color-brand)" strokeWidth="2" />
          <path d="M50 55l7 7 13-14" fill="none" stroke="var(--dh-color-brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="85" cy="30" r="5" fill="var(--dh-color-accent-soft)" stroke="var(--dh-color-accent)" strokeWidth="1.5" />
          <circle cx="30" cy="75" r="4" fill="var(--dh-color-success-soft)" stroke="var(--dh-color-success)" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}

/**
 * EmptyState — Displays an illustration, title, description,
 * and optional action button when there is no data to show.
 */
export function EmptyState({
  illustration = "no-data",
  title,
  description,
  action,
  className = "",
  "data-testid": testId,
}: EmptyStateProps) {
  const classes = ["dh-empty-state", className].filter(Boolean).join(" ");

  return (
    <div className={classes} data-testid={testId}>
      <EmptyIllustration type={illustration} />
      <h3 className="dh-empty-state__title">{title}</h3>
      {description && (
        <p className="dh-empty-state__description">{description}</p>
      )}
      {action && <div className="dh-empty-state__action">{action}</div>}
    </div>
  );
}

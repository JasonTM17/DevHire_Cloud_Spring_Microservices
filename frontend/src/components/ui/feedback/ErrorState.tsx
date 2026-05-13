"use client";

import type { ReactNode } from "react";

export type ErrorStateVariant = "inline" | "route" | "network";

export interface ErrorStateProps {
  variant?: ErrorStateVariant;
  title?: string;
  message?: string;
  /** Called when user clicks the reset/retry button */
  onRetry?: () => void;
  /** Custom action slot (overrides default retry/reset button) */
  action?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

const DEFAULT_TITLES: Record<ErrorStateVariant, string> = {
  inline: "Something went wrong",
  route: "Page error",
  network: "Connection problem",
};

const DEFAULT_MESSAGES: Record<ErrorStateVariant, string> = {
  inline: "An unexpected error occurred. Please try again.",
  route: "This page encountered an error and could not be displayed.",
  network: "Unable to connect to the server. Check your connection and try again.",
};

const BUTTON_LABELS: Record<ErrorStateVariant, string> = {
  inline: "Try again",
  route: "Reset page",
  network: "Retry connection",
};

/**
 * ErrorState — Error display component with variant-specific behavior.
 * - inline: compact error for embedding within a page section
 * - route: full-page error with reset button (used in error.tsx boundaries)
 * - network: network failure with retry button
 */
export function ErrorState({
  variant = "inline",
  title,
  message,
  onRetry,
  action,
  className = "",
  "data-testid": testId,
}: ErrorStateProps) {
  const resolvedTitle = title || DEFAULT_TITLES[variant];
  const resolvedMessage = message || DEFAULT_MESSAGES[variant];

  const classes = [
    "dh-error-state",
    `dh-error-state--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="alert" data-testid={testId}>
      <ErrorIllustration variant={variant} />
      <h3 className="dh-error-state__title">{resolvedTitle}</h3>
      <p className="dh-error-state__message">{resolvedMessage}</p>
      {action ? (
        <div className="dh-error-state__action">{action}</div>
      ) : onRetry ? (
        <button
          className="dh-error-state__button"
          onClick={onRetry}
          type="button"
        >
          {BUTTON_LABELS[variant]}
        </button>
      ) : null}
    </div>
  );
}

function ErrorIllustration({ variant }: { variant: ErrorStateVariant }) {
  return (
    <svg
      className="dh-error-state__illustration"
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      {variant === "inline" && (
        <>
          <circle cx="40" cy="40" r="28" fill="var(--dh-color-danger-soft)" stroke="var(--dh-color-danger-border)" strokeWidth="2" />
          <path d="M40 28v16" stroke="var(--dh-color-danger)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="52" r="2" fill="var(--dh-color-danger)" />
        </>
      )}
      {variant === "route" && (
        <>
          <rect x="15" y="20" width="50" height="40" rx="6" fill="var(--dh-color-danger-soft)" stroke="var(--dh-color-danger-border)" strokeWidth="2" />
          <line x1="30" y1="35" x2="50" y2="55" stroke="var(--dh-color-danger)" strokeWidth="3" strokeLinecap="round" />
          <line x1="50" y1="35" x2="30" y2="55" stroke="var(--dh-color-danger)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {variant === "network" && (
        <>
          <circle cx="40" cy="40" r="28" fill="var(--dh-color-warn-soft)" stroke="var(--dh-color-warn-border)" strokeWidth="2" />
          <path d="M28 45a17 17 0 0 1 24 0" fill="none" stroke="var(--dh-color-warn)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M33 50a10 10 0 0 1 14 0" fill="none" stroke="var(--dh-color-warn)" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="40" cy="55" r="2.5" fill="var(--dh-color-warn)" />
          <line x1="25" y1="25" x2="55" y2="55" stroke="var(--dh-color-danger)" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

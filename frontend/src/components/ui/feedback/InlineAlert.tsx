"use client";

import { useState, type ReactNode } from "react";

export type InlineAlertVariant = "info" | "success" | "warning" | "error";

export interface InlineAlertProps {
  variant?: InlineAlertVariant;
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
  icon?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

const DEFAULT_ICONS: Record<InlineAlertVariant, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
};

/**
 * InlineAlert — Inline alert banner with variant styling,
 * optional dismiss button, and icon.
 */
export function InlineAlert({
  variant = "info",
  title,
  children,
  dismissible = false,
  icon,
  className = "",
  "data-testid": testId,
}: InlineAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const classes = [
    "dh-inline-alert",
    `dh-inline-alert--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} role="alert" data-testid={testId}>
      <span className="dh-inline-alert__icon" aria-hidden="true">
        {icon || DEFAULT_ICONS[variant]}
      </span>
      <div className="dh-inline-alert__content">
        {title && <p className="dh-inline-alert__title">{title}</p>}
        <div className="dh-inline-alert__body">{children}</div>
      </div>
      {dismissible && (
        <button
          className="dh-inline-alert__close"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss alert"
          type="button"
        >
          ×
        </button>
      )}
    </div>
  );
}

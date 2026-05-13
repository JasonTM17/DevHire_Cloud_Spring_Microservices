"use client";

import { useEffect, useRef, useCallback } from "react";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastProps {
  id: string;
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
  onDismiss: (id: string) => void;
  className?: string;
  "data-testid"?: string;
}

const ICONS: Record<ToastVariant, string> = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✕",
};

/**
 * Toast — Individual toast notification with variant styling,
 * auto-dismiss timer, and close button.
 */
export function Toast({
  id,
  variant = "info",
  title,
  description,
  duration = 5000,
  onDismiss,
  className = "",
  "data-testid": testId,
}: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    onDismiss(id);
  }, [id, onDismiss]);

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(dismiss, duration);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, dismiss]);

  const classes = [
    "dh-toast",
    `dh-toast--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      role="alert"
      data-testid={testId}
    >
      <span className="dh-toast__icon" aria-hidden="true">
        {ICONS[variant]}
      </span>
      <div className="dh-toast__content">
        <p className="dh-toast__title">{title}</p>
        {description && (
          <p className="dh-toast__description">{description}</p>
        )}
      </div>
      <button
        className="dh-toast__close"
        onClick={dismiss}
        aria-label="Dismiss notification"
        type="button"
      >
        ×
      </button>
    </div>
  );
}

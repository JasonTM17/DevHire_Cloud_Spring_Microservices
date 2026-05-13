"use client";

import { useAssessmentTimer } from "@/hooks/useAssessmentTimer";
import type { TimerSeverity } from "@/hooks/useAssessmentTimer";

export interface AssessmentTimerProps {
  assignedAt: number;
  dueAt: number;
  status: string;
  onAutoSubmit?: () => void;
  className?: string;
  "data-testid"?: string;
}

/**
 * AssessmentTimer — Visual countdown timer with severity-based styling.
 *
 * Renders mm:ss format with CSS classes based on timer severity:
 * - .dh-timer--normal: default state
 * - .dh-timer--warning: ≤25% time remaining (yellow/orange)
 * - .dh-timer--critical: ≤10% time remaining (red + pulse animation)
 * - .dh-timer--expired: time is up (gray, strikethrough)
 * - .dh-timer--locked: assessment locked (gray, lock icon)
 *
 * Accessibility: uses aria-live region to announce severity changes to screen readers.
 *
 * Requirements: 4.5, 9.5
 */
export function AssessmentTimer({
  assignedAt,
  dueAt,
  status,
  onAutoSubmit,
  className,
  "data-testid": testId,
}: AssessmentTimerProps) {
  const { formatted, severity, ariaLive } = useAssessmentTimer({
    assignedAt,
    dueAt,
    status,
    onAutoSubmit,
  });

  const severityClass = `dh-timer--${severity}`;
  const wrapperClassName = `dh-timer ${severityClass}${className ? ` ${className}` : ""}`;

  return (
    <div className={wrapperClassName} data-testid={testId} role="timer">
      {/* Screen reader announcement region */}
      <span
        className="dh-timer__announce"
        aria-live={ariaLive}
        aria-atomic="true"
      >
        {getAriaLabel(severity, formatted)}
      </span>

      {/* Visual display */}
      {severity === "locked" && (
        <span className="dh-timer__lock-icon" aria-hidden="true">
          🔒
        </span>
      )}
      <span className="dh-timer__display" aria-hidden="true">
        {formatted}
      </span>
    </div>
  );
}

/**
 * Generates an accessible label for the timer based on severity.
 */
function getAriaLabel(severity: TimerSeverity, formatted: string): string {
  switch (severity) {
    case "normal":
      return `${formatted} remaining`;
    case "warning":
      return `Warning: ${formatted} remaining`;
    case "critical":
      return `Critical: ${formatted} remaining`;
    case "expired":
      return "Time expired";
    case "locked":
      return "Assessment locked";
  }
}

export default AssessmentTimer;

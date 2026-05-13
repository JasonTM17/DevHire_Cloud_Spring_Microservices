"use client";

import { useEffect, useRef, useState } from "react";
import {
  classifyTimer,
  timerAriaLive,
  formatTimer,
  type TimerSeverity,
} from "@/hooks/useAssessmentTimer";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export interface AssessmentTimerProps {
  /** Timestamp (ms) when the assessment was assigned */
  assignedAt: number;
  /** Timestamp (ms) when the assessment is due */
  dueAt: number;
  /** Assessment status string (e.g. 'IN_PROGRESS', 'LOCKED') */
  status: string;
  /** Callback fired exactly once when timer expires */
  onAutoSubmit?: () => void;
  /** Additional CSS class */
  className?: string;
}

/* --------------------------------------------------------------------------
   AssessmentTimer Component
   -------------------------------------------------------------------------- */

/**
 * Countdown timer for code assessments.
 *
 * Renders mm:ss with severity-based CSS classes:
 * - .dh-timer--normal (> 25% remaining)
 * - .dh-timer--warning (10–25% remaining)
 * - .dh-timer--critical (≤ 10% remaining, with pulse animation)
 * - .dh-timer--expired (time's up)
 * - .dh-timer--locked (assessment locked)
 *
 * Includes an aria-live region that announces severity changes to screen readers.
 */
export function AssessmentTimer({
  assignedAt,
  dueAt,
  status,
  onAutoSubmit,
  className = "",
}: AssessmentTimerProps) {
  const totalSeconds = Math.max(0, Math.floor((dueAt - assignedAt) / 1000));
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const hasAutoSubmittedRef = useRef(false);

  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  // Compute initial state
  const computeState = () => {
    if (status === "LOCKED") {
      return {
        remainingSeconds: 0,
        severity: "locked" as TimerSeverity,
        formatted: "00:00",
      };
    }
    const nowMs = Date.now();
    const remaining = Math.floor((dueAt - nowMs) / 1000);
    const severity = classifyTimer(remaining, totalSeconds);
    return {
      remainingSeconds: Math.max(0, remaining),
      severity,
      formatted: formatTimer(remaining),
    };
  };

  const [timerState, setTimerState] = useState(computeState);
  const prevSeverityRef = useRef<TimerSeverity>(timerState.severity);

  // Countdown interval
  useEffect(() => {
    if (status === "LOCKED") {
      setTimerState({
        remainingSeconds: 0,
        severity: "locked",
        formatted: "00:00",
      });
      return;
    }

    // Compute initial
    const initial = computeState();
    setTimerState(initial);

    if (initial.severity === "expired") {
      if (!hasAutoSubmittedRef.current) {
        hasAutoSubmittedRef.current = true;
        onAutoSubmitRef.current?.();
      }
      return;
    }

    const intervalId = setInterval(() => {
      const nowMs = Date.now();
      const remaining = Math.floor((dueAt - nowMs) / 1000);
      const severity = classifyTimer(remaining, totalSeconds);
      const formatted = formatTimer(remaining);

      setTimerState({
        remainingSeconds: Math.max(0, remaining),
        severity,
        formatted,
      });

      if (severity === "expired") {
        clearInterval(intervalId);
        if (!hasAutoSubmittedRef.current) {
          hasAutoSubmittedRef.current = true;
          onAutoSubmitRef.current?.();
        }
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueAt, totalSeconds, status]);

  // Track severity changes for aria announcement
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (timerState.severity !== prevSeverityRef.current) {
      prevSeverityRef.current = timerState.severity;
      // Announce severity change
      switch (timerState.severity) {
        case "warning":
          setAnnouncement(`Warning: ${timerState.formatted} remaining`);
          break;
        case "critical":
          setAnnouncement(`Critical: ${timerState.formatted} remaining`);
          break;
        case "expired":
          setAnnouncement("Time expired");
          break;
        case "locked":
          setAnnouncement("Assessment locked");
          break;
        default:
          setAnnouncement("");
      }
    }
  }, [timerState.severity, timerState.formatted]);

  const ariaLive = timerAriaLive(timerState.severity);
  const severityClass = `dh-timer--${timerState.severity}`;
  const classes = ["dh-timer", severityClass, className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="timer" aria-label="Assessment countdown timer">
      {timerState.severity === "locked" && (
        <span className="dh-timer__lock-icon" aria-hidden="true">
          🔒
        </span>
      )}
      <span className="dh-timer__display">{timerState.formatted}</span>
      <span
        className="dh-timer__announce"
        aria-live={ariaLive}
        aria-atomic="true"
      >
        {announcement}
      </span>
    </div>
  );
}

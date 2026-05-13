"use client";

import { useState, useEffect, useRef } from "react";

const LOCKED_STATUSES = new Set([
  "SUBMITTED",
  "AUTO_REVIEWED",
  "REVIEWED",
  "EMPLOYER_REVIEWED",
  "PASSED",
  "FAILED",
]);

export type UseAssessmentTimerOptions = {
  dueAt: string | null | undefined;
  status: string;
  onAutoSubmit: () => Promise<void>;
};

export type TimerState = {
  display: string;
  isWarning: boolean;
  isCritical: boolean;
  isExpired: boolean;
  isLocked: boolean;
};

function formatTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    const hh = String(hours).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

function getRemainingSeconds(dueAt: string): number {
  const dueTime = new Date(dueAt).getTime();
  const now = Date.now();
  return Math.floor((dueTime - now) / 1000);
}

export function useAssessmentTimer(options: UseAssessmentTimerOptions): TimerState {
  const { dueAt, status, onAutoSubmit } = options;

  const onAutoSubmitRef = useRef(onAutoSubmit);
  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  const hasAutoSubmittedRef = useRef(false);

  const isLocked = LOCKED_STATUSES.has(status);

  const [timerState, setTimerState] = useState<TimerState>(() => {
    if (isLocked) {
      return { display: "Submitted", isWarning: false, isCritical: false, isExpired: false, isLocked: true };
    }
    if (!dueAt) {
      return { display: "No deadline", isWarning: false, isCritical: false, isExpired: false, isLocked: false };
    }
    const remaining = getRemainingSeconds(dueAt);
    if (remaining <= 0) {
      return { display: "Time expired", isWarning: false, isCritical: true, isExpired: true, isLocked: false };
    }
    return {
      display: formatTime(remaining),
      isWarning: remaining < 300,
      isCritical: remaining < 60,
      isExpired: false,
      isLocked: false,
    };
  });

  useEffect(() => {
    // Handle locked status
    if (isLocked) {
      setTimerState({ display: "Submitted", isWarning: false, isCritical: false, isExpired: false, isLocked: true });
      return;
    }

    // Handle null/undefined dueAt
    if (!dueAt) {
      setTimerState({ display: "No deadline", isWarning: false, isCritical: false, isExpired: false, isLocked: false });
      return;
    }

    // Handle dueAt in the past at load
    const initialRemaining = getRemainingSeconds(dueAt);
    if (initialRemaining <= 0) {
      setTimerState({ display: "Time expired", isWarning: false, isCritical: true, isExpired: true, isLocked: false });
      return;
    }

    // Active countdown
    const intervalId = setInterval(() => {
      const remaining = getRemainingSeconds(dueAt);

      if (remaining <= 0) {
        setTimerState({ display: "Time expired", isWarning: false, isCritical: true, isExpired: true, isLocked: false });
        clearInterval(intervalId);

        // Call onAutoSubmit once
        if (!hasAutoSubmittedRef.current) {
          hasAutoSubmittedRef.current = true;
          onAutoSubmitRef.current();
        }
        return;
      }

      setTimerState({
        display: formatTime(remaining),
        isWarning: remaining < 300,
        isCritical: remaining < 60,
        isExpired: false,
        isLocked: false,
      });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [dueAt, isLocked]);

  return timerState;
}

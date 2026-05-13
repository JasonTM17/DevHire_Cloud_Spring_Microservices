"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// --- Pure types ---

export type TimerSeverity = 'normal' | 'warning' | 'critical' | 'expired' | 'locked';

export interface TimerState {
  remainingSeconds: number;
  severity: TimerSeverity;
  ariaLive: 'off' | 'polite' | 'assertive';
  formatted: string;
}

// --- Pure classifier (exported for property testing) ---

/**
 * Classifies timer severity based on remaining time relative to total duration.
 *
 * - If status === 'LOCKED' → 'locked'
 * - If remaining <= 0 → 'expired'
 * - If remaining/total <= 0.10 → 'critical'
 * - If remaining/total <= 0.25 → 'warning'
 * - Otherwise → 'normal'
 */
export function classifyTimer(remaining: number, total: number, status?: string): TimerSeverity {
  if (status === 'LOCKED') return 'locked';
  if (remaining <= 0) return 'expired';
  if (total <= 0) return 'normal'; // guard against division by zero
  const ratio = remaining / total;
  if (ratio <= 0.10) return 'critical';
  if (ratio <= 0.25) return 'warning';
  return 'normal';
}

// --- Pure ariaLive mapper (exported) ---

/**
 * Maps timer severity to the appropriate aria-live politeness level.
 *
 * - normal → 'off'
 * - warning → 'polite'
 * - critical → 'assertive'
 * - locked → 'polite'
 * - expired → 'polite'
 */
export function timerAriaLive(severity: TimerSeverity): 'off' | 'polite' | 'assertive' {
  switch (severity) {
    case 'normal': return 'off';
    case 'warning': return 'polite';
    case 'critical': return 'assertive';
    case 'locked': return 'polite';
    case 'expired': return 'polite';
  }
}

// --- Pure formatter (exported) ---

/**
 * Formats seconds into mm:ss format.
 * Negative or zero values return "00:00".
 */
export function formatTimer(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const totalSec = Math.floor(seconds);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// --- Hook ---

export interface UseAssessmentTimerOptions {
  assignedAt: number;
  dueAt: number;
  status: string;
  onAutoSubmit?: () => void;
}

/**
 * React hook for assessment countdown timer with relative severity thresholds.
 *
 * Computes remaining = dueAt - now (seconds), updates every 1s via setInterval.
 * Calls onAutoSubmit exactly once when transitioning to 'expired'.
 */
export function useAssessmentTimer(opts: UseAssessmentTimerOptions): TimerState {
  const { assignedAt, dueAt, status, onAutoSubmit } = opts;

  const onAutoSubmitRef = useRef(onAutoSubmit);
  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  const hasAutoSubmittedRef = useRef(false);
  const totalSeconds = Math.max(0, Math.floor((dueAt - assignedAt) / 1000));

  const computeState = useCallback((): TimerState => {
    const nowMs = Date.now();
    const remaining = Math.floor((dueAt - nowMs) / 1000);
    const severity = classifyTimer(remaining, totalSeconds, status === 'LOCKED' ? 'LOCKED' : undefined);
    return {
      remainingSeconds: Math.max(0, remaining),
      severity,
      ariaLive: timerAriaLive(severity),
      formatted: formatTimer(remaining),
    };
  }, [dueAt, totalSeconds, status]);

  const [timerState, setTimerState] = useState<TimerState>(computeState);

  useEffect(() => {
    // If locked, set state once and don't start interval
    if (status === 'LOCKED') {
      setTimerState({
        remainingSeconds: 0,
        severity: 'locked',
        ariaLive: 'polite',
        formatted: '00:00',
      });
      return;
    }

    // Compute initial state
    const initial = computeState();
    setTimerState(initial);

    // If already expired at mount, fire auto-submit once
    if (initial.severity === 'expired' && !hasAutoSubmittedRef.current) {
      hasAutoSubmittedRef.current = true;
      onAutoSubmitRef.current?.();
    }

    // Don't start interval if already expired
    if (initial.severity === 'expired') return;

    const intervalId = setInterval(() => {
      const nowMs = Date.now();
      const remaining = Math.floor((dueAt - nowMs) / 1000);
      const severity = classifyTimer(remaining, totalSeconds, undefined);
      const newState: TimerState = {
        remainingSeconds: Math.max(0, remaining),
        severity,
        ariaLive: timerAriaLive(severity),
        formatted: formatTimer(remaining),
      };

      setTimerState(newState);

      // Trigger auto-submit exactly once on expiration
      if (severity === 'expired') {
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
  }, [dueAt, totalSeconds, status, computeState]);

  return timerState;
}

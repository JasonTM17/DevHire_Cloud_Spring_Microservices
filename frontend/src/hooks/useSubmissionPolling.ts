"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  submissionReducer,
  type SubmissionStep,
  type SubmissionEvent,
} from "@/lib/ide/submissionReducer";
import { api } from "@/lib/api";
import type { CodeRun } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionPollingOptions {
  /** Assessment ID */
  assessmentId: string;
  /** Run ID to poll */
  runId: string;
  /** Callback when submission completes successfully */
  onComplete?: (run: CodeRun) => void;
  /** Callback when submission fails */
  onFail?: (run: CodeRun) => void;
  /** Callback when polling gives up after 3 consecutive failures */
  onPollingError?: (error: string) => void;
}

export interface SubmissionPollingState {
  /** Current step in the submission state machine */
  step: SubmissionStep;
  /** Error message when polling fails 3 consecutive times */
  error: string | undefined;
  /** Whether polling is active */
  isPolling: boolean;
  /** The latest CodeRun data */
  run: CodeRun | undefined;
}

export interface UseSubmissionPollingReturn {
  state: SubmissionPollingState;
  /** Start polling for a submission */
  start: () => void;
  /** Stop polling manually */
  stop: () => void;
  /** Reset to idle state */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_DELAY_MS = 1000;
const BACKOFF_FACTOR = 1.5;
const MAX_DELAY_MS = 5000;
const MAX_CONSECUTIVE_FAILURES = 3;
const POLLING_ERROR_MESSAGE =
  "Run status unavailable; refresh to retry";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps a CodeRun status/sandboxStatus to a SubmissionEvent.
 * Returns null if the status doesn't map to a known event.
 */
function mapRunStatusToEvent(run: CodeRun): SubmissionEvent | null {
  const status = run.status?.toLowerCase();
  const sandboxStatus = run.sandboxStatus?.toLowerCase();

  // Terminal states
  if (status === "completed" || status === "done") {
    if (run.verdict?.toLowerCase() === "accepted" || run.failureReason == null) {
      return { type: "COMPLETE" };
    }
    return { type: "FAIL" };
  }

  if (status === "failed" || status === "error") {
    return { type: "FAIL" };
  }

  // In-progress states
  if (sandboxStatus === "compiling" || status === "compiling") {
    return { type: "COMPILE_START" };
  }

  if (
    sandboxStatus === "running_visible" ||
    sandboxStatus === "running-visible" ||
    status === "running_visible"
  ) {
    return { type: "VISIBLE_TESTS_START" };
  }

  if (
    sandboxStatus === "running_hidden" ||
    sandboxStatus === "running-hidden" ||
    status === "running_hidden" ||
    status === "running"
  ) {
    return { type: "HIDDEN_TESTS_START" };
  }

  // Pending / queued — no state transition yet
  return null;
}

/**
 * Compute the next polling delay with exponential backoff.
 * delay = min(initialDelay * factor^attempt, maxDelay)
 */
function computeDelay(attempt: number): number {
  const delay = INITIAL_DELAY_MS * Math.pow(BACKOFF_FACTOR, attempt);
  return Math.min(delay, MAX_DELAY_MS);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook that polls `api.codeAssessmentRun` with exponential backoff.
 *
 * - Starts at 1s interval, backs off with factor 1.5, caps at 5s when status = pending
 * - Stops when status is done or failed
 * - Stops and shows error after 3 consecutive poll failures
 *
 * Requirements: 5.1, 11.3
 */
export function useSubmissionPolling(
  options: SubmissionPollingOptions
): UseSubmissionPollingReturn {
  const { assessmentId, runId, onComplete, onFail, onPollingError } = options;

  const [step, setStep] = useState<SubmissionStep>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const [isPolling, setIsPolling] = useState(false);
  const [run, setRun] = useState<CodeRun | undefined>(undefined);

  // Refs for stable access in async callbacks
  const stepRef = useRef<SubmissionStep>("idle");
  const consecutiveFailuresRef = useRef(0);
  const pendingPollCountRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingRef = useRef(false);
  const mountedRef = useRef(true);

  // Callbacks refs to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onFailRef = useRef(onFail);
  const onPollingErrorRef = useRef(onPollingError);
  onCompleteRef.current = onComplete;
  onFailRef.current = onFail;
  onPollingErrorRef.current = onPollingError;

  const optionsRef = useRef({ assessmentId, runId });
  optionsRef.current = { assessmentId, runId };

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const updateStep = useCallback((newStep: SubmissionStep) => {
    stepRef.current = newStep;
    if (mountedRef.current) {
      setStep(newStep);
    }
  }, []);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (mountedRef.current) {
      setIsPolling(false);
    }
  }, []);

  const poll = useCallback(async () => {
    if (!isPollingRef.current || !mountedRef.current) return;

    const { assessmentId: aId, runId: rId } = optionsRef.current;

    try {
      const codeRun = await api.codeAssessmentRun(aId, rId);

      if (!mountedRef.current || !isPollingRef.current) return;

      // Reset consecutive failures on success
      consecutiveFailuresRef.current = 0;

      if (mountedRef.current) {
        setRun(codeRun);
      }

      // Map API response to state machine event
      const event = mapRunStatusToEvent(codeRun);

      if (event) {
        const nextStep = submissionReducer(stepRef.current, event);
        updateStep(nextStep);

        // Check if we've reached a terminal state
        if (nextStep === "complete") {
          stopPolling();
          onCompleteRef.current?.(codeRun);
          return;
        }

        if (nextStep === "failed") {
          stopPolling();
          onFailRef.current?.(codeRun);
          return;
        }
      }

      // Still in progress — schedule next poll
      // Use backoff when status is pending (no event mapped)
      if (event === null) {
        pendingPollCountRef.current += 1;
      } else {
        pendingPollCountRef.current = 0;
      }

      const nextDelay = computeDelay(pendingPollCountRef.current);

      if (isPollingRef.current && mountedRef.current) {
        timeoutRef.current = setTimeout(poll, nextDelay);
      }
    } catch (err) {
      if (!mountedRef.current || !isPollingRef.current) return;

      consecutiveFailuresRef.current += 1;

      if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        // Stop polling after 3 consecutive failures
        stopPolling();
        const errorMsg = POLLING_ERROR_MESSAGE;
        if (mountedRef.current) {
          setError(errorMsg);
        }
        onPollingErrorRef.current?.(errorMsg);
        return;
      }

      // Retry with backoff
      const nextDelay = computeDelay(consecutiveFailuresRef.current);
      if (isPollingRef.current && mountedRef.current) {
        timeoutRef.current = setTimeout(poll, nextDelay);
      }
    }
  }, [updateStep, stopPolling]);

  const start = useCallback(() => {
    if (isPollingRef.current) return; // Already polling

    // Reset state
    consecutiveFailuresRef.current = 0;
    pendingPollCountRef.current = 0;
    isPollingRef.current = true;

    if (mountedRef.current) {
      setIsPolling(true);
      setError(undefined);
      // Transition to compiling as the first step
      const nextStep = submissionReducer(stepRef.current, { type: "COMPILE_START" });
      updateStep(nextStep);
    }

    // Start first poll after initial delay
    timeoutRef.current = setTimeout(poll, INITIAL_DELAY_MS);
  }, [poll, updateStep]);

  const reset = useCallback(() => {
    stopPolling();
    consecutiveFailuresRef.current = 0;
    pendingPollCountRef.current = 0;
    updateStep("idle");
    if (mountedRef.current) {
      setError(undefined);
      setRun(undefined);
    }
  }, [stopPolling, updateStep]);

  return {
    state: {
      step,
      error,
      isPolling,
      run,
    },
    start,
    stop: stopPolling,
    reset,
  };
}

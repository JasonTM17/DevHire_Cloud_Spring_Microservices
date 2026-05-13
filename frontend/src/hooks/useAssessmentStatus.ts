"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket, type StompMessage } from "./useWebSocket";
import {
  isSummaryEvent,
  isProgressEvent,
  applyProgressEvent,
  countCompleted,
  TIMEOUT_MS,
  type TestCaseStatus,
  type TestCaseResult,
  type AssessmentProgress,
  type AssessmentSummary,
} from "./assessmentStatusUtils";

// Re-export types and utilities for consumers
export { TIMEOUT_MS, isSummaryEvent, isProgressEvent, applyProgressEvent, countCompleted };
export type { TestCaseStatus, TestCaseResult, AssessmentProgress, AssessmentSummary };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseAssessmentStatusReturn {
  /** Individual test case results indexed by test case index */
  testCases: TestCaseResult[];
  /** Total number of test cases in the assessment */
  totalTestCases: number;
  /** Number of test cases that have completed (passed or failed) */
  completedCount: number;
  /** Current test case index being executed */
  currentIndex: number;
  /** Whether a timeout warning is active (no event received within 60s) */
  timedOut: boolean;
  /** Final summary once all test cases complete, or null if still in progress */
  summary: AssessmentSummary | null;
  /** Whether the assessment is still in progress */
  isRunning: boolean;
  /** Manually refresh assessment status (triggers REST fallback) */
  manualRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAssessmentStatus — Subscribes to real-time assessment progress events
 * and tracks test case execution status.
 *
 * Features:
 * - Subscribes to `/topic/assessment/{assessmentId}/status`
 * - Tracks test case progress (index, total, status per case)
 * - Displays timeout warning if no event received within 60s
 * - Offers manual refresh option on timeout
 *
 * Requirements: 6.3, 6.5
 */
export function useAssessmentStatus(
  token: string,
  assessmentId: string | null
): UseAssessmentStatusReturn {
  const [testCases, setTestCases] = useState<TestCaseResult[]>([]);
  const [totalTestCases, setTotalTestCases] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [timedOut, setTimedOut] = useState(false);
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const { connectionStatus, subscribe } = useWebSocket(token);

  // -------------------------------------------------------------------------
  // Timeout management
  // -------------------------------------------------------------------------

  const resetTimeout = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
    }
    setTimedOut(false);

    timeoutTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setTimedOut(true);
      }
    }, TIMEOUT_MS);
  }, []);

  const clearTimeoutTimer = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  // -------------------------------------------------------------------------
  // Handle progress event
  // -------------------------------------------------------------------------

  const handleProgressEvent = useCallback(
    (progress: AssessmentProgress) => {
      setTotalTestCases(progress.totalTestCases);
      setCurrentIndex(progress.testCaseIndex);
      setIsRunning(true);
      setTimedOut(false);
      resetTimeout();

      setTestCases((prev) => applyProgressEvent(prev, progress));
    },
    [resetTimeout]
  );

  // -------------------------------------------------------------------------
  // Handle summary event
  // -------------------------------------------------------------------------

  const handleSummaryEvent = useCallback((summaryData: AssessmentSummary) => {
    setSummary(summaryData);
    setIsRunning(false);
    clearTimeoutTimer();
    setTimedOut(false);
  }, [clearTimeoutTimer]);

  // -------------------------------------------------------------------------
  // WebSocket subscription
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (connectionStatus !== "connected" || !assessmentId) return;

    // Reset state for new subscription
    setTestCases([]);
    setTotalTestCases(0);
    setCurrentIndex(-1);
    setTimedOut(false);
    setSummary(null);
    setIsRunning(true);

    // Start timeout timer
    resetTimeout();

    const sub = subscribe(
      `/topic/assessment/${assessmentId}/status`,
      (msg: StompMessage) => {
        try {
          const payload = JSON.parse(msg.body);

          // Determine if this is a summary event or a progress event
          if (isSummaryEvent(payload)) {
            handleSummaryEvent(payload);
          } else if (isProgressEvent(payload)) {
            handleProgressEvent(payload);
          }
        } catch {
          // Ignore malformed messages
        }
      }
    );

    return () => {
      sub.unsubscribe();
      clearTimeoutTimer();
    };
  }, [
    connectionStatus,
    assessmentId,
    subscribe,
    handleProgressEvent,
    handleSummaryEvent,
    resetTimeout,
    clearTimeoutTimer,
  ]);

  // -------------------------------------------------------------------------
  // Manual refresh (REST fallback)
  // -------------------------------------------------------------------------

  const manualRefresh = useCallback(async () => {
    if (!assessmentId) return;

    setTimedOut(false);
    resetTimeout();

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/assessments/${assessmentId}/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      // If the response contains a summary, it means the assessment is complete
      if (data.overallStatus && data.totalPassed !== undefined) {
        handleSummaryEvent(data as AssessmentSummary);
      } else if (data.testCases && Array.isArray(data.testCases)) {
        // Bulk update test case results from REST response
        setTotalTestCases(data.totalTestCases ?? data.testCases.length);
        setTestCases(
          data.testCases.map((tc: { index: number; status: TestCaseStatus; executionTimeMs: number; errorOutput?: string }) => ({
            index: tc.index,
            status: tc.status,
            executionTimeMs: tc.executionTimeMs ?? 0,
            errorOutput: tc.errorOutput,
          }))
        );
        if (data.currentIndex !== undefined) {
          setCurrentIndex(data.currentIndex);
        }
      }
    } catch {
      // Silently fail — user can retry
    }
  }, [assessmentId, token, resetTimeout, handleSummaryEvent]);

  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------

  const completedCount = countCompleted(testCases);

  // -------------------------------------------------------------------------
  // Lifecycle cleanup
  // -------------------------------------------------------------------------

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearTimeoutTimer();
    };
  }, [clearTimeoutTimer]);

  return {
    testCases,
    totalTestCases,
    completedCount,
    currentIndex,
    timedOut,
    summary,
    isRunning,
    manualRefresh,
  };
}

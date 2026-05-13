"use client";

import { useState, useCallback, useRef } from "react";
import { runWithRetry, type RetryOptions, type RetryState } from "../lib/backoff";

export type UseRetryOptions = Omit<RetryOptions, "onAttempt">;

export interface UseRetryReturn<T> {
  run: (fn: () => Promise<T>) => Promise<T>;
  state: RetryState;
}

/**
 * React hook wrapper around `runWithRetry`.
 *
 * Tracks attempt count, last error, and retrying status in React state.
 *
 * Requirements: 11.3
 */
export function useRetry<T = unknown>(opts: UseRetryOptions): UseRetryReturn<T> {
  const [state, setState] = useState<RetryState>({
    attempts: 0,
    lastError: null,
    isRetrying: false,
  });

  const optsRef = useRef(opts);
  optsRef.current = opts;

  const run = useCallback(async (fn: () => Promise<T>): Promise<T> => {
    setState({ attempts: 0, lastError: null, isRetrying: true });

    try {
      const result = await runWithRetry<T>(fn, {
        ...optsRef.current,
        onAttempt: (attempt, error) => {
          setState({ attempts: attempt, lastError: error, isRetrying: true });
        },
      });

      setState((prev) => ({ ...prev, isRetrying: false }));
      return result;
    } catch (error: unknown) {
      setState((prev) => ({
        ...prev,
        lastError: error,
        isRetrying: false,
      }));
      throw error;
    }
  }, []);

  return { run, state };
}

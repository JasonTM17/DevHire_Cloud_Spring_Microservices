"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// --- Types ---

export interface DataFetcherOptions {
  /** Polling interval in ms. Set to 0 or undefined to disable polling. */
  refreshInterval?: number;
  /** Pause polling when document is hidden. Default: true */
  pauseWhenHidden?: boolean;
  /** Revalidate when window regains focus. Default: false */
  revalidateOnFocus?: boolean;
}

export interface DataFetcherResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isValidating: boolean;
  mutate: (data?: T | Promise<T> | ((current: T | undefined) => T)) => Promise<void>;
}

interface DataFetcherCacheEntry {
  data: unknown;
  error: Error | undefined;
  timestamp: number;
  inFlight?: Promise<unknown>;
  subscribers: Set<() => void>;
}

// --- Module-scoped cache ---

const cache: Map<string, DataFetcherCacheEntry> = new Map();

// --- Helpers ---

function getOrCreateEntry(key: string): DataFetcherCacheEntry {
  if (!cache.has(key)) {
    cache.set(key, {
      data: undefined,
      error: undefined,
      timestamp: 0,
      inFlight: undefined,
      subscribers: new Set(),
    });
  }
  return cache.get(key)!;
}

function notifySubscribers(key: string): void {
  const entry = cache.get(key);
  if (entry) {
    entry.subscribers.forEach((cb) => cb());
  }
}

// --- Hook ---

export function useDataFetcher<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: DataFetcherOptions = {}
): DataFetcherResult<T> {
  const {
    refreshInterval = 0,
    pauseWhenHidden = true,
    revalidateOnFocus = false,
  } = options;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const keyRef = useRef(key);
  keyRef.current = key;

  // Force re-render trigger
  const [, forceUpdate] = useState(0);

  const revalidate = useCallback(async (): Promise<void> => {
    const currentKey = keyRef.current;
    if (!currentKey) return;

    const entry = getOrCreateEntry(currentKey);

    // Dedup: if there's already an in-flight request for this key, reuse it
    if (entry.inFlight) {
      try {
        await entry.inFlight;
      } catch {
        // Error already handled in the original request
      }
      return;
    }

    // Mark as validating and notify
    entry.inFlight = fetcherRef.current();
    notifySubscribers(currentKey);

    try {
      const data = await entry.inFlight;
      entry.data = data;
      entry.error = undefined;
      entry.timestamp = Date.now();
    } catch (err) {
      entry.error = err instanceof Error ? err : new Error(String(err));
    } finally {
      entry.inFlight = undefined;
      notifySubscribers(currentKey);
    }
  }, []);

  // Subscribe to cache entry changes
  useEffect(() => {
    if (!key) return;

    const entry = getOrCreateEntry(key);
    const subscriber = () => forceUpdate((n) => n + 1);
    entry.subscribers.add(subscriber);

    return () => {
      entry.subscribers.delete(subscriber);
      // Clean up entry if no more subscribers and no data
      if (entry.subscribers.size === 0 && entry.data === undefined && !entry.inFlight) {
        cache.delete(key);
      }
    };
  }, [key]);

  // Initial fetch on mount or key change
  useEffect(() => {
    if (!key) return;
    revalidate();
  }, [key, revalidate]);

  // Polling with refreshInterval
  useEffect(() => {
    if (!key || !refreshInterval || refreshInterval <= 0) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isPaused = false;

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        revalidate();
      }, refreshInterval);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (!pauseWhenHidden) return;

      if (document.visibilityState === "hidden") {
        isPaused = true;
        stopPolling();
      } else {
        if (isPaused) {
          isPaused = false;
          // Revalidate immediately on resume, then restart polling
          revalidate();
          startPolling();
        }
      }
    };

    startPolling();

    if (pauseWhenHidden) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      stopPolling();
      if (pauseWhenHidden) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [key, refreshInterval, pauseWhenHidden, revalidate]);

  // Revalidate on focus
  useEffect(() => {
    if (!key || !revalidateOnFocus) return;

    const handleFocus = () => {
      revalidate();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [key, revalidateOnFocus, revalidate]);

  // Mutate function
  const mutate = useCallback(
    async (
      updater?: T | Promise<T> | ((current: T | undefined) => T)
    ): Promise<void> => {
      const currentKey = keyRef.current;
      if (!currentKey) return;

      const entry = getOrCreateEntry(currentKey);

      if (updater === undefined) {
        // No argument: revalidate from server
        await revalidate();
        return;
      }

      if (typeof updater === "function") {
        // Optimistic update with function
        const fn = updater as (current: T | undefined) => T;
        entry.data = fn(entry.data as T | undefined);
        entry.error = undefined;
        entry.timestamp = Date.now();
        notifySubscribers(currentKey);
      } else if (updater instanceof Promise) {
        // Async updater
        try {
          const data = await updater;
          entry.data = data;
          entry.error = undefined;
          entry.timestamp = Date.now();
          notifySubscribers(currentKey);
        } catch (err) {
          entry.error = err instanceof Error ? err : new Error(String(err));
          notifySubscribers(currentKey);
        }
      } else {
        // Direct value
        entry.data = updater;
        entry.error = undefined;
        entry.timestamp = Date.now();
        notifySubscribers(currentKey);
      }
    },
    [revalidate]
  );

  // Read current state from cache
  const entry = key ? getOrCreateEntry(key) : null;

  return {
    data: entry?.data as T | undefined,
    error: entry?.error,
    isValidating: entry?.inFlight !== undefined,
    mutate,
  };
}

// --- Exported for testing ---

/** Clear the entire cache. Useful for tests. */
export function __clearCache(): void {
  cache.clear();
}

/** Get the raw cache map. Useful for tests. */
export function __getCache(): Map<string, DataFetcherCacheEntry> {
  return cache;
}

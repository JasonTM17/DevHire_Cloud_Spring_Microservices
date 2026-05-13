"use client";

import { useSyncExternalStore } from "react";

/**
 * SSR-safe hook that subscribes to a CSS media query and returns whether it matches.
 * Uses `useSyncExternalStore` for concurrent-safe subscription to `MediaQueryList`.
 *
 * @param query - CSS media query string, e.g. '(min-width: 768px)'
 * @returns boolean indicating if the media query currently matches
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => getSnapshot(query),
    () => getServerSnapshot(),
  );
}

function subscribe(query: string, callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => {
    mql.removeEventListener("change", callback);
  };
}

function getSnapshot(query: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(query).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

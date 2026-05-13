"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useWebSocket, type StompMessage } from "@/hooks/useWebSocket";
import type { RankChangeEvent, LeaderboardEntry } from "@/types/domain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseLeaderboardReturn {
  /** Current leaderboard entries sorted by rank ascending */
  entries: LeaderboardEntry[];
  /** Whether the hook is actively subscribed to leaderboard updates */
  isSubscribed: boolean;
  /** Clear all transition animations manually */
  clearTransitions: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Duration (ms) after which rank-change animations are cleared */
const TRANSITION_DURATION_MS = 1_500;

/** STOMP destination for leaderboard rank-change events */
const LEADERBOARD_TOPIC = "/topic/leaderboard";

// ---------------------------------------------------------------------------
// Pure utility — exported for testability
// ---------------------------------------------------------------------------

/**
 * Apply a rank-change event to the current leaderboard entries.
 *
 * - If the candidate already exists, update their rank/score and set transition direction.
 * - If the candidate is new, insert them with transition "new".
 * - Re-sorts entries by rank ascending after mutation.
 *
 * @param entries - Current leaderboard entries
 * @param event - Incoming rank-change event
 * @returns Updated leaderboard entries with transition metadata
 */
export function applyRankChange(
  entries: LeaderboardEntry[],
  event: RankChangeEvent
): LeaderboardEntry[] {
  const now = Date.now();
  const existingIndex = entries.findIndex((e) => e.candidateId === event.candidateId);

  let updated: LeaderboardEntry[];

  if (existingIndex >= 0) {
    // Update existing entry
    const transition: LeaderboardEntry["transition"] =
      event.newRank < event.previousRank ? "up" : event.newRank > event.previousRank ? "down" : "none";

    updated = entries.map((entry, idx) =>
      idx === existingIndex
        ? { ...entry, rank: event.newRank, score: event.score, transition, transitionAt: now }
        : entry
    );
  } else {
    // New candidate on the leaderboard
    const newEntry: LeaderboardEntry = {
      candidateId: event.candidateId,
      rank: event.newRank,
      score: event.score,
      transition: "new",
      transitionAt: now,
    };
    updated = [...entries, newEntry];
  }

  // Sort by rank ascending
  updated.sort((a, b) => a.rank - b.rank);

  return updated;
}

/**
 * Determines whether a rank-change event matches the subscribed leaderboard context.
 *
 * Context filtering ensures that only events relevant to the leaderboard the user
 * is currently viewing are processed (Requirement 7.5).
 *
 * @param event - The incoming rank-change event
 * @param assessmentId - The assessment context the user is viewing (null = all)
 * @returns true if the event should be processed
 */
export function matchesContext(event: RankChangeEvent, assessmentId: string | null): boolean {
  if (!assessmentId) return true; // No filter — accept all events
  return event.assessmentId === assessmentId;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useLeaderboard — Subscribes to real-time leaderboard rank-change events
 * and manages animated transitions for rank movements.
 *
 * Features:
 * - Subscribes to `/topic/leaderboard` STOMP destination
 * - Filters events by assessment context (Requirement 7.5)
 * - Tracks rank transitions (up/down/new) for animation (Requirement 7.3)
 * - Auto-clears transition animations after TRANSITION_DURATION_MS
 *
 * Requirements: 7.3
 */
export function useLeaderboard(
  token: string,
  assessmentId: string | null = null
): UseLeaderboardReturn {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const assessmentIdRef = useRef(assessmentId);
  const transitionTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Keep ref in sync
  assessmentIdRef.current = assessmentId;

  const { connectionStatus, subscribe } = useWebSocket(token);

  // -------------------------------------------------------------------------
  // Schedule transition clear for a candidate
  // -------------------------------------------------------------------------

  const scheduleTransitionClear = useCallback((candidateId: string) => {
    // Clear any existing timer for this candidate
    const existing = transitionTimersRef.current.get(candidateId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.candidateId === candidateId
            ? { ...entry, transition: "none" as const, transitionAt: 0 }
            : entry
        )
      );
      transitionTimersRef.current.delete(candidateId);
    }, TRANSITION_DURATION_MS);

    transitionTimersRef.current.set(candidateId, timer);
  }, []);

  // -------------------------------------------------------------------------
  // Handle incoming rank-change event
  // -------------------------------------------------------------------------

  const handleRankChange = useCallback(
    (msg: StompMessage) => {
      try {
        const event: RankChangeEvent = JSON.parse(msg.body);

        // Context filtering — only process events for the viewed leaderboard
        if (!matchesContext(event, assessmentIdRef.current)) return;

        setEntries((prev) => applyRankChange(prev, event));

        // Schedule animation clear
        scheduleTransitionClear(event.candidateId);
      } catch {
        // Ignore malformed messages
      }
    },
    [scheduleTransitionClear]
  );

  // -------------------------------------------------------------------------
  // WebSocket subscription
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (connectionStatus !== "connected") {
      setIsSubscribed(false);
      return;
    }

    const sub = subscribe(LEADERBOARD_TOPIC, handleRankChange);
    setIsSubscribed(true);

    return () => {
      sub.unsubscribe();
      setIsSubscribed(false);
    };
  }, [connectionStatus, subscribe, handleRankChange]);

  // -------------------------------------------------------------------------
  // Clear transitions manually
  // -------------------------------------------------------------------------

  const clearTransitions = useCallback(() => {
    // Clear all pending timers
    transitionTimersRef.current.forEach((timer) => clearTimeout(timer));
    transitionTimersRef.current.clear();

    setEntries((prev) =>
      prev.map((entry) => ({ ...entry, transition: "none" as const, transitionAt: 0 }))
    );
  }, []);

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      transitionTimersRef.current.forEach((timer) => clearTimeout(timer));
      transitionTimersRef.current.clear();
    };
  }, []);

  return {
    entries,
    isSubscribed,
    clearTransitions,
  };
}

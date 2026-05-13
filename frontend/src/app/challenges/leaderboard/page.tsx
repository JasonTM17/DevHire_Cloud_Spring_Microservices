"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import {
  mergeLeaderboard,
  filterLeaderboard,
} from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import {
  LeaderboardTable,
  LeaderboardFilters,
  CurrentUserBanner,
} from "@/components/leaderboard";
import type { LeaderboardPeriod } from "@/components/leaderboard";
import { SkeletonLoader } from "@/components/ui/primitives";
import { EmptyState } from "@/components/ui/feedback/EmptyState";

/**
 * API response shape for the leaderboard endpoint.
 */
interface LeaderboardApiResponse {
  entries: LeaderboardEntry[];
  availableTopics: string[];
  currentUserId?: string;
}

/**
 * Fetcher function for the leaderboard API.
 * In production this would call the real backend; here we define the shape.
 */
async function fetchLeaderboard(period: string): Promise<LeaderboardApiResponse> {
  const res = await fetch(`/api/leaderboard?period=${encodeURIComponent(period)}`);
  if (!res.ok) {
    throw new Error(`Leaderboard fetch failed: ${res.status}`);
  }
  return res.json();
}

/**
 * LeaderboardPage — Displays the challenge leaderboard with real-time polling.
 *
 * Features:
 * - Polls every 5 seconds with pause when tab is hidden
 * - Period toggle (weekly | monthly | all-time)
 * - Topic filter dropdown
 * - Merges new data with previous snapshot for smooth updates
 * - Shows current user's rank in a sticky banner
 * - Loading skeleton, empty state, and error handling
 *
 * Requirements: 5.3, 5.4
 */
export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [topic, setTopic] = useState<string>("");

  // Track previous entries for merge
  const previousEntriesRef = useRef<LeaderboardEntry[]>([]);
  // Track rank changes for pulse animation
  const [rankChangedUserIds, setRankChangedUserIds] = useState<Set<string>>(
    new Set()
  );

  const fetcherFn = useCallback(() => fetchLeaderboard(period), [period]);

  const { data, error, isValidating } = useDataFetcher<LeaderboardApiResponse>(
    `/api/leaderboard?period=${period}`,
    fetcherFn,
    { refreshInterval: 5000, pauseWhenHidden: true }
  );

  // Merge new entries with previous snapshot
  const mergedEntries = useMemo(() => {
    if (!data?.entries) return previousEntriesRef.current;

    const oldEntries = previousEntriesRef.current;
    const merged = mergeLeaderboard(oldEntries, data.entries);

    // Detect rank changes for animation
    if (oldEntries.length > 0) {
      const oldRankMap = new Map(oldEntries.map((e) => [e.userId, e.rank]));
      const changed = new Set<string>();
      for (const entry of merged) {
        const oldRank = oldRankMap.get(entry.userId);
        if (oldRank !== undefined && oldRank !== entry.rank) {
          changed.add(entry.userId);
        }
      }
      if (changed.size > 0) {
        setRankChangedUserIds(changed);
        // Clear pulse after animation duration (2s)
        setTimeout(() => setRankChangedUserIds(new Set()), 2000);
      }
    }

    previousEntriesRef.current = merged;
    return merged;
  }, [data?.entries]);

  // Apply client-side filter
  const filteredEntries = useMemo(() => {
    if (mergedEntries.length === 0) return [];
    return filterLeaderboard(mergedEntries, {
      period,
      topic: topic || undefined,
    });
  }, [mergedEntries, period, topic]);

  // Find current user's entry
  const currentUserEntry = useMemo(() => {
    if (!data?.currentUserId) return null;
    return filteredEntries.find((e) => e.userId === data.currentUserId) ?? null;
  }, [filteredEntries, data?.currentUserId]);

  const availableTopics = data?.availableTopics ?? [];

  // Loading state (first load only)
  if (!data && isValidating && !error) {
    return (
      <div className="dh-leaderboard-page" data-testid="leaderboard-page">
        <div className="dh-leaderboard-page__header">
          <h1 className="dh-leaderboard-page__title">Leaderboard</h1>
        </div>
        <SkeletonLoader shape="rect" width="100%" height="40px" aria-label="Loading filters" />
        <SkeletonLoader shape="rect" width="100%" height="300px" aria-label="Loading leaderboard" />
      </div>
    );
  }

  // Empty state — no data available (e.g., feature not yet enabled)
  if (!data && !isValidating && !error) {
    return (
      <div className="dh-leaderboard-page" data-testid="leaderboard-page">
        <div className="dh-leaderboard-page__header">
          <h1 className="dh-leaderboard-page__title">Leaderboard</h1>
        </div>
        <EmptyState
          illustration="no-data"
          title="Coming soon"
          description="The leaderboard will be available once challenges are live."
          data-testid="leaderboard-empty"
        />
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className="dh-leaderboard-page" data-testid="leaderboard-page">
        <div className="dh-leaderboard-page__header">
          <h1 className="dh-leaderboard-page__title">Leaderboard</h1>
        </div>
        <EmptyState
          illustration="no-data"
          title="Unable to load leaderboard"
          description={error.message}
          data-testid="leaderboard-error"
        />
      </div>
    );
  }

  return (
    <div className="dh-leaderboard-page" data-testid="leaderboard-page">
      <div className="dh-leaderboard-page__header">
        <h1 className="dh-leaderboard-page__title">Leaderboard</h1>
      </div>

      <LeaderboardFilters
        period={period}
        topic={topic}
        onPeriodChange={setPeriod}
        onTopicChange={setTopic}
        availableTopics={availableTopics}
      />

      {filteredEntries.length === 0 ? (
        <EmptyState
          illustration="no-results"
          title="No entries found"
          description="Try adjusting your filters to see more results."
          data-testid="leaderboard-no-results"
        />
      ) : (
        <LeaderboardTable
          entries={filteredEntries}
          currentUserId={data?.currentUserId}
          rankChangedUserIds={rankChangedUserIds}
        />
      )}

      {currentUserEntry && (
        <CurrentUserBanner
          rank={currentUserEntry.rank}
          username={currentUserEntry.username}
        />
      )}
    </div>
  );
}

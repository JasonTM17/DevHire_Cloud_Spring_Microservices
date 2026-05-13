"use client";

import { Card } from "@/components/ui/layout/Card";
import { ProgressBar } from "@/components/ui/primitives/ProgressBar";
import { Badge } from "@/components/ui/primitives/Badge";
import { SkeletonLoader } from "@/components/ui/primitives/SkeletonLoader";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { computeProgress } from "@/lib/challenges/progress";
import type { SubmissionRecord, ProgressSummary } from "@/lib/challenges/progress";

// --- Types ---

interface ProgressApiResponse {
  submissions: SubmissionRecord[];
  rank?: number;
  totalByDifficulty?: { easy: number; medium: number; hard: number };
}

/**
 * External progress prop shape — allows the component to be used
 * without internal data fetching (useful for testing and composition).
 */
export interface ProgressData {
  total: number;
  solved: number;
  easy: { total: number; solved: number };
  medium: { total: number; solved: number };
  hard: { total: number; solved: number };
}

export interface ProgressSummaryPanelProps {
  /** External progress data. When provided, skips internal data fetching. */
  progress?: ProgressData;
  /** Current streak in days (used with external progress prop) */
  streak?: number;
  /** Rank position from leaderboard (used with external progress prop) */
  rank?: number;
  className?: string;
  "data-testid"?: string;
}

// --- Component ---

/**
 * ProgressSummaryPanel — Displays candidate's challenge progress:
 * total solved, breakdown by difficulty with progress bars,
 * current streak, and rank position.
 *
 * Supports two modes:
 * 1. External `progress` prop — renders directly from provided data (no fetch)
 * 2. No `progress` prop — fetches from `/api/candidate/me/progress` internally
 *
 * Requirements: 3.3
 */
export function ProgressSummaryPanel({
  progress: externalProgress,
  streak: externalStreak,
  rank: externalRank,
  className = "",
  "data-testid": testId,
}: ProgressSummaryPanelProps) {
  // If external progress is provided, render directly without fetching
  if (externalProgress) {
    return (
      <ProgressSummaryContent
        totalSolved={externalProgress.solved}
        totalAvailable={externalProgress.total}
        byDifficulty={{
          easy: externalProgress.easy.solved,
          medium: externalProgress.medium.solved,
          hard: externalProgress.hard.solved,
        }}
        totalByDifficulty={{
          easy: externalProgress.easy.total,
          medium: externalProgress.medium.total,
          hard: externalProgress.hard.total,
        }}
        streak={externalStreak ?? 0}
        rank={externalRank}
        className={className}
        testId={testId}
      />
    );
  }

  // Internal data-fetching mode
  return (
    <ProgressSummaryFetcher className={className} testId={testId} />
  );
}

// --- Internal fetcher wrapper ---

function ProgressSummaryFetcher({
  className,
  testId,
}: {
  className: string;
  testId?: string;
}) {
  const { data, error, isValidating } = useDataFetcher<ProgressApiResponse>(
    "/api/candidate/me/progress",
    () =>
      fetch("/api/candidate/me/progress").then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch progress: ${res.status}`);
        return res.json();
      })
  );

  // Loading state
  if (!data && isValidating) {
    return (
      <Card className={`dh-progress-summary ${className}`} data-testid={testId}>
        <ProgressSummarySkeleton />
      </Card>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Card className={`dh-progress-summary ${className}`} data-testid={testId}>
        <EmptyState
          illustration="no-data"
          title="Unable to load progress"
          description="Please try again later."
        />
      </Card>
    );
  }

  // Compute progress from submissions
  const submissions = data?.submissions ?? [];
  const progress: ProgressSummary = computeProgress(submissions);

  const rank = data?.rank;
  const totalByDifficulty = data?.totalByDifficulty ?? {
    easy: 0,
    medium: 0,
    hard: 0,
  };

  // Empty state when no submissions yet
  if (progress.totalSolved === 0 && submissions.length === 0) {
    return (
      <Card className={`dh-progress-summary ${className}`} data-testid={testId}>
        <EmptyState
          illustration="first-time"
          title="No submissions yet"
          description="Start solving challenges to track your progress here."
        />
      </Card>
    );
  }

  return (
    <ProgressSummaryContent
      totalSolved={progress.totalSolved}
      totalAvailable={
        totalByDifficulty.easy + totalByDifficulty.medium + totalByDifficulty.hard
      }
      byDifficulty={progress.byDifficulty}
      totalByDifficulty={totalByDifficulty}
      streak={progress.streak}
      rank={rank}
      className={className}
      testId={testId}
    />
  );
}

// --- Presentational content ---

interface ProgressSummaryContentProps {
  totalSolved: number;
  totalAvailable: number;
  byDifficulty: { easy: number; medium: number; hard: number };
  totalByDifficulty: { easy: number; medium: number; hard: number };
  streak: number;
  rank?: number;
  className: string;
  testId?: string;
}

function ProgressSummaryContent({
  totalSolved,
  totalAvailable,
  byDifficulty,
  totalByDifficulty,
  streak,
  rank,
  className,
  testId,
}: ProgressSummaryContentProps) {
  return (
    <Card
      className={`dh-progress-summary ${className}`}
      data-testid={testId}
      aria-label="Challenge progress summary"
    >
      {/* Header: Total solved + stats */}
      <div className="dh-progress-summary__header">
        <div className="dh-progress-summary__total">
          <span className="dh-progress-summary__total-count">
            {totalSolved}
          </span>
          <span className="dh-progress-summary__total-label">
            {totalAvailable > 0
              ? `${totalSolved} / ${totalAvailable} Solved`
              : "Problems Solved"}
          </span>
        </div>

        <div className="dh-progress-summary__stats">
          {/* Streak */}
          <div className="dh-progress-summary__stat">
            <span className="dh-progress-summary__stat-emoji" aria-hidden="true">
              🔥
            </span>
            <span className="dh-progress-summary__stat-value">
              {streak}
            </span>
            <span>day streak</span>
          </div>

          {/* Rank */}
          {rank != null && (
            <div className="dh-progress-summary__stat">
              <span className="dh-progress-summary__stat-emoji" aria-hidden="true">
                🏆
              </span>
              <Badge variant="info" size="sm">
                #{rank}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Difficulty breakdown */}
      <div className="dh-progress-summary__breakdown">
        <h4 className="dh-progress-summary__breakdown-title">
          Breakdown by Difficulty
        </h4>
        <div
          className="dh-progress-summary__difficulty"
          role="list"
          aria-label="Progress by difficulty level"
        >
          <DifficultyRow
            label="Easy"
            solved={byDifficulty.easy}
            total={totalByDifficulty.easy}
            variant="success"
          />
          <DifficultyRow
            label="Medium"
            solved={byDifficulty.medium}
            total={totalByDifficulty.medium}
            variant="warning"
          />
          <DifficultyRow
            label="Hard"
            solved={byDifficulty.hard}
            total={totalByDifficulty.hard}
            variant="danger"
          />
        </div>
      </div>
    </Card>
  );
}

// --- Sub-components ---

interface DifficultyRowProps {
  label: string;
  solved: number;
  total: number;
  variant: "success" | "warning" | "danger";
}

function DifficultyRow({ label, solved, total, variant }: DifficultyRowProps) {
  // If total is 0, show 0% progress
  const max = total > 0 ? total : 1;

  return (
    <div className="dh-progress-summary__difficulty-row" role="listitem">
      <span className="dh-progress-summary__difficulty-label">{label}</span>
      <div className="dh-progress-summary__difficulty-bar">
        <ProgressBar
          value={solved}
          max={max}
          variant={variant}
          size="sm"
          aria-label={`${label} difficulty: ${solved} of ${total} solved`}
        />
      </div>
      <span className="dh-progress-summary__difficulty-count">
        {solved}/{total}
      </span>
    </div>
  );
}

function ProgressSummarySkeleton() {
  return (
    <div
      className="dh-progress-summary__skeleton"
      aria-label="Loading progress summary"
    >
      {/* Total count skeleton */}
      <div className="dh-progress-summary__skeleton-row">
        <SkeletonLoader shape="heading" width="4rem" height="2.5rem" />
        <SkeletonLoader shape="text" width="8rem" />
      </div>
      {/* Difficulty bars skeleton */}
      <SkeletonLoader shape="rect" width="100%" height="1rem" />
      <SkeletonLoader shape="rect" width="100%" height="1rem" />
      <SkeletonLoader shape="rect" width="100%" height="1rem" />
      {/* Stats skeleton */}
      <div className="dh-progress-summary__skeleton-row">
        <SkeletonLoader shape="text" width="6rem" />
        <SkeletonLoader shape="text" width="4rem" />
      </div>
    </div>
  );
}

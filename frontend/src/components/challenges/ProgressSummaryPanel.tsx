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

export interface ProgressSummaryPanelProps {
  className?: string;
  "data-testid"?: string;
}

// --- Component ---

/**
 * ProgressSummaryPanel — Displays candidate's challenge progress:
 * total solved, breakdown by difficulty with progress bars,
 * current streak, and rank position.
 *
 * Requirements: 3.3
 */
export function ProgressSummaryPanel({
  className = "",
  "data-testid": testId,
}: ProgressSummaryPanelProps) {
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

  // Error state — silently show empty if error
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

  // Attach rank from API response if available
  const rank = data?.rank;

  // Total counts per difficulty (for ratio display)
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
    <Card className={`dh-progress-summary ${className}`} data-testid={testId}>
      {/* Header: Total solved + stats */}
      <div className="dh-progress-summary__header">
        <div className="dh-progress-summary__total">
          <span className="dh-progress-summary__total-count">
            {progress.totalSolved}
          </span>
          <span className="dh-progress-summary__total-label">
            Problems Solved
          </span>
        </div>

        <div className="dh-progress-summary__stats">
          {/* Streak */}
          <div className="dh-progress-summary__stat">
            <span className="dh-progress-summary__stat-emoji" aria-hidden="true">
              🔥
            </span>
            <span className="dh-progress-summary__stat-value">
              {progress.streak}
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
        <div className="dh-progress-summary__difficulty">
          <DifficultyRow
            label="Easy"
            solved={progress.byDifficulty.easy}
            total={totalByDifficulty.easy}
            variant="success"
          />
          <DifficultyRow
            label="Medium"
            solved={progress.byDifficulty.medium}
            total={totalByDifficulty.medium}
            variant="warning"
          />
          <DifficultyRow
            label="Hard"
            solved={progress.byDifficulty.hard}
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
    <div className="dh-progress-summary__difficulty-row">
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

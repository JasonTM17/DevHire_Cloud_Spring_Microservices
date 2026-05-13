"use client";

import { useState, useCallback, useMemo } from "react";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { SkeletonLoader } from "@/components/ui/primitives/SkeletonLoader";
import type { CodeSubmissionSummary } from "@/types/domain";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export type SubmissionVerdict =
  | "Accepted"
  | "Wrong Answer"
  | "Time Limit Exceeded"
  | "Compile Error"
  | "Runtime Error";

export interface SubmissionHistoryListProps {
  /** Challenge ID to fetch submission history for */
  challengeId: string;
  /** Current code in the editor (used for diff comparison) */
  currentCode?: string;
  /** Additional CSS class */
  className?: string;
  /** Test ID for testing */
  "data-testid"?: string;
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

/**
 * Normalizes the verdict string from the API into a display-friendly format.
 */
function normalizeVerdict(verdict: string | undefined): SubmissionVerdict {
  if (!verdict) return "Compile Error";
  const lower = verdict.toLowerCase();
  if (lower.includes("accept")) return "Accepted";
  if (lower.includes("wrong")) return "Wrong Answer";
  if (lower.includes("time") || lower === "tle") return "Time Limit Exceeded";
  if (lower.includes("compile")) return "Compile Error";
  if (lower.includes("runtime")) return "Runtime Error";
  return "Compile Error";
}

/**
 * Maps verdict to CSS modifier class.
 */
function verdictModifier(verdict: SubmissionVerdict): string {
  switch (verdict) {
    case "Accepted":
      return "dh-submission-history__verdict--accepted";
    case "Wrong Answer":
      return "dh-submission-history__verdict--wrong-answer";
    case "Time Limit Exceeded":
      return "dh-submission-history__verdict--tle";
    case "Compile Error":
      return "dh-submission-history__verdict--compile-error";
    case "Runtime Error":
      return "dh-submission-history__verdict--runtime-error";
  }
}

/**
 * Formats a timestamp string into a human-readable relative or absolute time.
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

/* --------------------------------------------------------------------------
   SubmissionRow — individual expandable row
   -------------------------------------------------------------------------- */

interface SubmissionRowProps {
  submission: CodeSubmissionSummary;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  currentCode?: string;
}

function SubmissionRow({
  submission,
  index,
  isExpanded,
  onToggle,
  currentCode,
}: SubmissionRowProps) {
  const verdict = normalizeVerdict(submission.verdict);
  const verdictClass = verdictModifier(verdict);
  const rowClasses = [
    "dh-submission-history__row",
    isExpanded && "dh-submission-history__row--expanded",
  ]
    .filter(Boolean)
    .join(" ");

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle]
  );

  const submittedCode = submission.submittedCode || submission.submittedCodePreview;

  return (
    <div className={rowClasses} data-testid={`submission-row-${index}`}>
      <button
        className="dh-submission-history__row-summary"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded}
        aria-label={`Submission ${submission.attemptNumber ?? index + 1}: ${verdict} at ${formatTimestamp(submission.submittedAt)}`}
        type="button"
      >
        {/* Main cell: timestamp + attempt */}
        <div className="dh-submission-history__cell-main">
          <span className="dh-submission-history__timestamp">
            {formatTimestamp(submission.submittedAt)}
          </span>
          <span className="dh-submission-history__attempt-label">
            Attempt #{submission.attemptNumber ?? index + 1}
          </span>
        </div>

        {/* Verdict chip */}
        <span className={`dh-submission-history__verdict ${verdictClass}`}>
          {verdict}
        </span>

        {/* Execution time */}
        <div className="dh-submission-history__cell-metric">
          <span className="dh-submission-history__metric-value">
            {submission.executionTimeMs}ms
          </span>
          <span className="dh-submission-history__metric-label">runtime</span>
        </div>

        {/* Memory usage */}
        <div className="dh-submission-history__cell-metric">
          <span className="dh-submission-history__metric-value">
            {submission.memoryKb}KB
          </span>
          <span className="dh-submission-history__metric-label">memory</span>
        </div>

        {/* Expand indicator */}
        <span className="dh-submission-history__expand-icon" aria-hidden="true">
          ▼
        </span>
      </button>

      {/* Expanded diff panel */}
      {isExpanded && (
        <div className="dh-submission-history__diff" role="region" aria-label="Submitted code">
          <div className="dh-submission-history__diff-header">
            <span className="dh-submission-history__diff-title">
              Submitted Code
            </span>
            <span className="dh-submission-history__diff-language">
              {submission.language}
            </span>
          </div>
          {submittedCode ? (
            <pre className="dh-submission-history__code-block">
              <code>{submittedCode}</code>
            </pre>
          ) : (
            <p className="dh-submission-history__no-code">
              Code not available for this submission.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Loading skeleton
   -------------------------------------------------------------------------- */

function LoadingSkeleton() {
  return (
    <div className="dh-submission-history__loading" aria-label="Loading submission history">
      {Array.from({ length: 3 }, (_, i) => (
        <SkeletonLoader key={i} shape="rect" height="56px" width="100%" />
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   SubmissionHistoryList component
   -------------------------------------------------------------------------- */

/**
 * SubmissionHistoryList — Displays a list of code submission attempts for a challenge.
 *
 * Features:
 * - Fetches submission history via `useDataFetcher`
 * - Shows verdict chip (color-coded), execution time, memory usage per attempt
 * - Click row to expand and view submitted code
 * - Empty state when no attempts exist
 * - Loading skeleton while fetching
 *
 * Usable both standalone and as a tab within ProblemPanel.
 *
 * Requirements: 5.5
 */
export function SubmissionHistoryList({
  challengeId,
  currentCode,
  className = "",
  "data-testid": testId = "submission-history-list",
}: SubmissionHistoryListProps) {
  const { data, error, isValidating } = useDataFetcher<CodeSubmissionSummary[]>(
    challengeId ? `submission-history-${challengeId}` : null,
    () => api.codeSubmissionHistory(challengeId)
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleRow = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // Sort submissions by date descending (most recent first)
  const sortedSubmissions = useMemo(() => {
    if (!data) return [];
    return [...data].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  }, [data]);

  const classes = ["dh-submission-history", className].filter(Boolean).join(" ");

  // Loading state
  if (!data && isValidating) {
    return (
      <div className={classes} data-testid={testId}>
        <LoadingSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={classes} data-testid={testId}>
        <div className="dh-submission-history__error">
          <EmptyState
            illustration="no-data"
            title="Failed to load submissions"
            description={error.message || "An error occurred while fetching submission history."}
          />
        </div>
      </div>
    );
  }

  // Empty state
  if (sortedSubmissions.length === 0) {
    return (
      <div className={classes} data-testid={testId}>
        <div className="dh-submission-history__empty">
          <EmptyState
            illustration="first-time"
            title="No submissions yet"
            description="Submit your solution to see your attempt history here."
            data-testid="submission-history-empty"
          />
        </div>
      </div>
    );
  }

  // Data loaded
  return (
    <div className={classes} data-testid={testId}>
      <div className="dh-submission-history__header">
        <h3 className="dh-submission-history__title">Submission History</h3>
        <span className="dh-submission-history__count">
          {sortedSubmissions.length} attempt{sortedSubmissions.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="dh-submission-history__list" role="list" aria-label="Submission attempts">
        {sortedSubmissions.map((submission, index) => (
          <SubmissionRow
            key={submission.id}
            submission={submission}
            index={index}
            isExpanded={expandedId === submission.id}
            onToggle={() => toggleRow(submission.id)}
            currentCode={currentCode}
          />
        ))}
      </div>
    </div>
  );
}

export default SubmissionHistoryList;

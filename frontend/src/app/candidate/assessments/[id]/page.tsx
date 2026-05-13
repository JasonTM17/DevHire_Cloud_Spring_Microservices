"use client";

import { useParams } from "next/navigation";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { ChallengeIDE } from "@/components/ui/ide/ChallengeIDE";
import { SkeletonLoader } from "@/components/ui/primitives/SkeletonLoader";
import { ErrorState } from "@/components/ui/feedback/ErrorState";
import { api } from "@/lib/api";
import type { CodeAssessment, CodeRun, CodeSubmissionSummary } from "@/types/domain";
import type { TestCase } from "@/components/ui/ide/ProblemPanel";

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

function mapVisibleTestCases(assessment: CodeAssessment): TestCase[] {
  if (!assessment.visibleTestCases) return [];
  return assessment.visibleTestCases.map((tc, idx) => ({
    id: tc.name || `test-${idx + 1}`,
    input: tc.input,
    expectedOutput: tc.expectedOutput ?? "",
    explanation: undefined,
  }));
}

/* --------------------------------------------------------------------------
   IDE Skeleton (renders < 100ms while loading)
   -------------------------------------------------------------------------- */

function IDESkeleton() {
  return (
    <div
      className="dh-challenge-ide-skeleton"
      aria-label="Loading assessment IDE"
      data-testid="ide-skeleton"
    >
      {/* Top bar skeleton */}
      <div className="dh-challenge-ide-skeleton__topbar">
        <SkeletonLoader shape="rect" width="200px" height="1.5rem" aria-label="Loading title" />
        <SkeletonLoader shape="rect" width="120px" height="1.5rem" aria-label="Loading timer" />
        <SkeletonLoader shape="rect" width="100px" height="2rem" aria-label="Loading submit button" />
      </div>

      {/* Body skeleton: two panes */}
      <div className="dh-challenge-ide-skeleton__body">
        {/* Left pane: problem description */}
        <div className="dh-challenge-ide-skeleton__left">
          <SkeletonLoader shape="heading" width="60%" height="1.5rem" />
          <SkeletonLoader shape="text" width="100%" height="0.875rem" />
          <SkeletonLoader shape="text" width="100%" height="0.875rem" />
          <SkeletonLoader shape="text" width="80%" height="0.875rem" />
          <SkeletonLoader shape="rect" width="100%" height="6rem" />
          <SkeletonLoader shape="text" width="100%" height="0.875rem" />
          <SkeletonLoader shape="text" width="90%" height="0.875rem" />
        </div>

        {/* Right pane: editor + terminal */}
        <div className="dh-challenge-ide-skeleton__right">
          <SkeletonLoader shape="rect" width="100%" height="2rem" aria-label="Loading tabs" />
          <SkeletonLoader shape="rect" width="100%" height="60%" aria-label="Loading editor" />
          <SkeletonLoader shape="rect" width="100%" height="30%" aria-label="Loading terminal" />
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Page Component
   -------------------------------------------------------------------------- */

/**
 * Candidate assessment IDE page — fullscreen LeetCode-style experience.
 *
 * AppShell already bypasses chrome for this route (task 5.1).
 * Fetches challenge + visible tests + in-progress run via useDataFetcher.
 * Renders skeleton < 100ms while loading.
 *
 * Requirements: 4.1, 10.3
 */
export default function CandidateAssessmentIDEPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;

  // Fetch assessment data
  const {
    data: assessment,
    error: assessmentError,
    isValidating: assessmentLoading,
  } = useDataFetcher<CodeAssessment>(
    assessmentId ? `assessment-${assessmentId}` : null,
    () => api.candidateCodeAssessment(assessmentId),
    { revalidateOnFocus: true }
  );

  // Fetch submission history
  const {
    data: submissions,
    error: submissionsError,
  } = useDataFetcher<CodeSubmissionSummary[]>(
    assessmentId ? `assessment-submissions-${assessmentId}` : null,
    () => api.candidateCodeAssessmentSubmissions(assessmentId),
    { revalidateOnFocus: true }
  );

  // Loading state — show skeleton immediately
  if (!assessment && assessmentLoading) {
    return <IDESkeleton />;
  }

  // Error state
  if (assessmentError && !assessment) {
    return (
      <div className="dh-challenge-ide-error" data-testid="ide-error">
        <ErrorState
          variant="network"
          title="Failed to load assessment"
          message={assessmentError.message || "Unable to reach the assessment service. Please try again."}
        />
      </div>
    );
  }

  // No assessment found
  if (!assessment) {
    return (
      <div className="dh-challenge-ide-error" data-testid="ide-not-found">
        <ErrorState
          variant="route"
          title="Assessment not found"
          message="The requested assessment could not be found or you don't have access to it."
        />
      </div>
    );
  }

  // Map visible test cases from assessment data
  const visibleTests = mapVisibleTestCases(assessment);
  const latestRun = assessment.latestRun;

  return (
    <ChallengeIDE
      assessment={assessment}
      visibleTests={visibleTests}
      latestRun={latestRun}
      submissions={submissions ?? []}
    />
  );
}

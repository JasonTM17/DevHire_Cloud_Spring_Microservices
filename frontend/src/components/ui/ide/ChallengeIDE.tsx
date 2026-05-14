"use client";

import { useState, useCallback, useRef } from "react";
import { SplitPane } from "./SplitPane";
import { Terminal, type TerminalRow, type TerminalStatus } from "./Terminal";
import { ProblemPanel, type TestCase, type SubmissionEntry } from "./ProblemPanel";
import { FileTab } from "./FileTab";
import { AssessmentTimer } from "./AssessmentTimer";
import { SubmissionProgressModal } from "./SubmissionProgressModal";
import { CandidateCodeEditor } from "@/components/CandidateCodeEditor";
import type { SubmissionStep } from "@/lib/ide/submissionReducer";
import type { CodeAssessment, CodeRun, CodeSubmissionSummary } from "@/types/domain";

import "@/styles/components/challenge-ide.css";
import "@/styles/components/ide-top-bar.css";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export interface ChallengeIDEProps {
  /** The assessment data */
  assessment: CodeAssessment;
  /** Visible test cases for the problem panel */
  visibleTests: TestCase[];
  /** In-progress or latest run data */
  latestRun?: CodeRun;
  /** Submission history */
  submissions: CodeSubmissionSummary[];
  /** Additional CSS class */
  className?: string;
}

/* --------------------------------------------------------------------------
   IDETopBar sub-component
   -------------------------------------------------------------------------- */

interface IDETopBarProps {
  title: string;
  language: string;
  availableLanguages: string[];
  onLanguageChange: (lang: string) => void;
  assignedAt: number;
  dueAt: number;
  status: string;
  onAutoSubmit: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isLocked: boolean;
  progressText: string;
}

function IDETopBar({
  title,
  language,
  availableLanguages,
  onLanguageChange,
  assignedAt,
  dueAt,
  status,
  onAutoSubmit,
  onSubmit,
  isSubmitting,
  isLocked,
  progressText,
}: IDETopBarProps) {
  return (
    <header className="dh-ide-topbar" data-testid="ide-topbar">
      <div className="dh-ide-topbar__left">
        <a
          href="/challenges"
          className="dh-ide-topbar__back"
          aria-label="Back to challenges"
        >
          ← Challenges
        </a>
        <span className="dh-ide-topbar__divider" aria-hidden="true" />
        <h1 className="dh-ide-topbar__title">{title}</h1>
      </div>

      <div className="dh-ide-topbar__center">
        {availableLanguages.length > 1 ? (
          <select
            className="dh-ide-topbar__language-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            aria-label="Programming language"
            disabled={isLocked}
          >
            {availableLanguages.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        ) : (
          <span className="dh-ide-topbar__language-pill" aria-label={`Programming language: ${language}`}>
            {language}
          </span>
        )}
      </div>

      <div className="dh-ide-topbar__right">
        <AssessmentTimer
          assignedAt={assignedAt}
          dueAt={dueAt}
          status={status}
          onAutoSubmit={onAutoSubmit}
        />
        <span className="dh-ide-topbar__progress" aria-label="Progress">
          {progressText}
        </span>
        <button
          type="button"
          className="dh-ide-topbar__submit"
          onClick={onSubmit}
          disabled={isSubmitting || isLocked}
          aria-label="Submit code"
        >
          {isSubmitting ? "Submitting…" : "Submit"}
        </button>
      </div>
    </header>
  );
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

const LOCKED_STATUSES = new Set([
  "SUBMITTED",
  "AUTO_REVIEWED",
  "REVIEWED",
  "EMPLOYER_REVIEWED",
  "PASSED",
  "FAILED",
]);

const DEFAULT_JAVA_PLACEHOLDER = [
  "class CandidateSolution {",
  "  String solve(String input) {",
  "    return \"\";",
  "  }",
  "}",
].join("\n");

function mapSubmissionsToEntries(submissions: CodeSubmissionSummary[]): SubmissionEntry[] {
  return submissions.map((sub) => ({
    id: sub.id,
    timestamp: sub.submittedAt,
    verdict: mapVerdict(sub.verdict),
    executionTimeMs: sub.executionTimeMs,
    memoryKB: sub.memoryKb,
    language: sub.language,
  }));
}

function mapVerdict(
  verdict?: string
): SubmissionEntry["verdict"] {
  switch (verdict) {
    case "ACCEPTED":
      return "Accepted";
    case "WRONG_ANSWER":
      return "Wrong Answer";
    case "TIME_LIMIT_EXCEEDED":
    case "TLE":
      return "Time Limit Exceeded";
    case "COMPILE_ERROR":
      return "Compile Error";
    case "RUNTIME_ERROR":
      return "Runtime Error";
    default:
      return "Wrong Answer";
  }
}

function buildTerminalRows(run?: CodeRun): TerminalRow[] {
  if (!run?.results) return [];
  return run.results.filter((result) => result.visibility !== "HIDDEN").map((result, idx) => ({
    testIndex: idx + 1,
    passed: result.passed,
    timeMs: result.executionTimeMs ?? 0,
    memoryKB: result.memoryKb ?? 0,
    verdict: result.verdict ?? (result.passed ? "ACCEPTED" : "WRONG_ANSWER"),
    expected: undefined,
    actual: result.output,
  }));
}

/* --------------------------------------------------------------------------
   ChallengeIDE Component
   -------------------------------------------------------------------------- */

/**
 * Full-screen LeetCode-style IDE shell.
 *
 * Layout:
 * - IDETopBar: breadcrumb back, language selector, timer, progress, submit button
 * - Outer horizontal SplitPane: Problem panel (left) / Editor+Terminal (right)
 * - Inner vertical SplitPane: Editor area (top) / Terminal (bottom)
 *
 * Requirements: 4.1, 4.3, 4.5, 4.7
 */
export function ChallengeIDE({
  assessment,
  visibleTests,
  latestRun,
  submissions,
  className = "",
}: ChallengeIDEProps) {
  const [language, setLanguage] = useState(assessment.language || "Java");
  const [code, setCode] = useState(assessment.submittedCode || assessment.starterCode || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState<SubmissionStep>("idle");
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  const isLocked = LOCKED_STATUSES.has(assessment.status);
  const assignedAt = new Date(assessment.assignedAt).getTime();
  const dueAt = new Date(assessment.dueAt).getTime();
  const timerStatus = isLocked ? "LOCKED" : assessment.status;

  const terminalRows = buildTerminalRows(latestRun);
  const visibleRunResults = latestRun?.results?.filter((result) => result.visibility !== "HIDDEN") ?? [];
  const terminalStatus: TerminalStatus = latestRun
    ? visibleRunResults.length
      ? "done"
      : "idle"
    : "idle";

  const submissionEntries = mapSubmissionsToEntries(submissions);
  const progressPassed = latestRun?.visiblePassed ?? 0;
  const progressTotal = Math.max(latestRun?.visibleTotal ?? 0, visibleTests.length, 1);
  const progressText = `${progressPassed}/${progressTotal} visible passed`;
  const availableLanguages = [assessment.language || "Java"];

  const handleAutoSubmit = useCallback(() => {
    // Auto-submit on timer expiry — placeholder for full implementation
    setIsSubmitting(true);
    setShowSubmissionModal(true);
    setSubmissionStep("compiling");
  }, []);

  const handleSubmit = useCallback(() => {
    if (isLocked) return;
    setIsSubmitting(true);
    setShowSubmissionModal(true);
    setSubmissionStep("compiling");
  }, [isLocked]);

  const handleCloseModal = useCallback(() => {
    setShowSubmissionModal(false);
    setIsSubmitting(false);
    setSubmissionStep("idle");
  }, []);

  const classes = ["dh-challenge-ide", className].filter(Boolean).join(" ");

  return (
    <div className={classes} data-testid="challenge-ide">
      <IDETopBar
        title={assessment.challengeTitle}
        language={language}
        availableLanguages={availableLanguages}
        onLanguageChange={setLanguage}
        assignedAt={assignedAt}
        dueAt={dueAt}
        status={timerStatus}
        onAutoSubmit={handleAutoSubmit}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isLocked={isLocked}
        progressText={progressText}
      />

      <div className="dh-challenge-ide__body">
        <SplitPane
          orientation="horizontal"
          initialRatio={0.4}
          minRatio={0.2}
          maxRatio={0.7}
          storageKey="dh.ide.horizontal"
          data-testid="ide-horizontal-split"
        >
          {/* Left: Problem Panel */}
          <ProblemPanel
            title={assessment.challengeTitle}
            descriptionMarkdown={assessment.prompt || ""}
            testCases={visibleTests}
            submissions={submissionEntries}
          />

          {/* Right: Editor + Terminal */}
          <SplitPane
            orientation="vertical"
            initialRatio={0.65}
            minRatio={0.3}
            maxRatio={0.85}
            storageKey="dh.ide.vertical"
            data-testid="ide-vertical-split"
          >
            {/* Editor area */}
            <div className="dh-challenge-ide__editor">
              <FileTab />
              <div
                className="dh-challenge-ide__editor-content"
                aria-label="Code editor"
              >
                <CandidateCodeEditor
                  value={code}
                  language={language}
                  disabled={isLocked}
                  placeholder={DEFAULT_JAVA_PLACEHOLDER}
                  onChange={setCode}
                />
              </div>
            </div>

            {/* Terminal */}
            <Terminal rows={terminalRows} status={terminalStatus} />
          </SplitPane>
        </SplitPane>
      </div>

      {/* Submission Progress Modal */}
      <SubmissionProgressModal
        open={showSubmissionModal}
        step={submissionStep}
        onClose={handleCloseModal}
      />
    </div>
  );
}

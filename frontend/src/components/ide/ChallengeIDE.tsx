"use client";

import { useCallback, useState } from "react";
import { SplitPane } from "@/components/ui/ide/SplitPane";
import { ProblemPanel } from "@/components/ui/ide/ProblemPanel";
import { Terminal } from "@/components/ui/ide/Terminal";
import { FileTab } from "@/components/ui/ide/FileTab";
import { SubmissionProgressModal } from "@/components/ui/ide/SubmissionProgressModal";
import { CandidateCodeEditor } from "@/components/CandidateCodeEditor";
import { IDETopBar } from "@/components/ide/IDETopBar";
import type { TestCase, SubmissionEntry } from "@/components/ui/ide/ProblemPanel";
import type { TerminalRow, TerminalStatus } from "@/components/ui/ide/Terminal";
import type { SubmissionStep } from "@/lib/ide/submissionReducer";
import type { EditorTabId } from "@/hooks/useIdeState";

import "@/styles/components/challenge-ide.css";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export interface ChallengeIDEProps {
  /** Challenge title */
  challengeTitle: string;
  /** Problem description in markdown */
  descriptionMarkdown: string;
  /** Visible test cases */
  testCases: TestCase[];
  /** Submission history entries */
  submissions: SubmissionEntry[];
  /** Current code value */
  code: string;
  /** Callback when code changes */
  onCodeChange: (value: string) => void;
  /** Currently selected language */
  language: string;
  /** Available languages for this challenge */
  availableLanguages: string[];
  /** Callback when language changes */
  onLanguageChange: (language: string) => void;
  /** Timer: assignment start timestamp (ms) */
  assignedAt: number;
  /** Timer: due timestamp (ms) */
  dueAt: number;
  /** Assessment status string */
  assessmentStatus: string;
  /** Terminal output rows */
  terminalRows: TerminalRow[];
  /** Terminal status */
  terminalStatus: TerminalStatus;
  /** Number of tests passed (for progress indicator) */
  testsPassed: number;
  /** Total number of visible tests (for progress indicator) */
  testsTotal: number;
  /** Whether the timer is locked or expired (disables submit) */
  timerLocked: boolean;
  /** Submission step (for progress modal) */
  submissionStep: SubmissionStep;
  /** Submission error message */
  submissionError?: string;
  /** Whether a submission is currently in progress */
  submitting: boolean;
  /** Callback to trigger submission */
  onSubmit: () => void;
  /** Callback when timer expires (auto-submit) */
  onAutoSubmit?: () => void;
  /** Callback when a submission row is clicked */
  onSubmissionClick?: (submissionId: string) => void;
  /** Callback when active editor tab changes */
  onTabChange?: (tabId: EditorTabId) => void;
  /** Visible tests JSON content (for the read-only tab) */
  visibleTestsJson?: string;
  /** Notes content */
  notesContent?: string;
  /** Callback when notes change */
  onNotesChange?: (value: string) => void;
  /** Additional CSS class */
  className?: string;
}

/* --------------------------------------------------------------------------
   ChallengeIDE Component
   -------------------------------------------------------------------------- */

/**
 * Main IDE shell for the LeetCode-style challenge assessment.
 *
 * Layout:
 * - IDETopBar (breadcrumb, language selector, timer, progress, submit)
 * - Outer horizontal SplitPane:
 *   - Left: ProblemPanel (description, test cases, submissions)
 *   - Right: Inner vertical SplitPane:
 *     - Top: FileTab + CandidateCodeEditor
 *     - Bottom: Terminal
 * - SubmissionProgressModal (shown during submission)
 *
 * Requirements: 4.1, 4.3, 4.5, 4.7
 */
export function ChallengeIDE({
  challengeTitle,
  descriptionMarkdown,
  testCases,
  submissions,
  code,
  onCodeChange,
  language,
  availableLanguages,
  onLanguageChange,
  assignedAt,
  dueAt,
  assessmentStatus,
  terminalRows,
  terminalStatus,
  testsPassed,
  testsTotal,
  timerLocked,
  submissionStep,
  submissionError,
  submitting,
  onSubmit,
  onAutoSubmit,
  onSubmissionClick,
  onTabChange,
  visibleTestsJson = "",
  notesContent = "",
  onNotesChange,
  className = "",
}: ChallengeIDEProps) {
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // Active editor tab state for determining what content to show
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTabId>("solution");

  const handleSubmit = useCallback(() => {
    setShowSubmissionModal(true);
    onSubmit();
  }, [onSubmit]);

  const handleCloseModal = useCallback(() => {
    setShowSubmissionModal(false);
  }, []);

  const handleTabChange = useCallback(
    (tabId: EditorTabId) => {
      setActiveEditorTab(tabId);
      onTabChange?.(tabId);
    },
    [onTabChange]
  );

  // Determine editor content and read-only state based on active tab
  const getEditorContent = (): { value: string; readOnly: boolean } => {
    switch (activeEditorTab) {
      case "solution":
        return { value: code, readOnly: false };
      case "visible-tests":
        return { value: visibleTestsJson, readOnly: true };
      case "notes":
        return { value: notesContent, readOnly: false };
      default:
        return { value: code, readOnly: false };
    }
  };

  const handleEditorChange = useCallback(
    (value: string) => {
      if (activeEditorTab === "solution") {
        onCodeChange(value);
      } else if (activeEditorTab === "notes") {
        onNotesChange?.(value);
      }
    },
    [activeEditorTab, onCodeChange, onNotesChange]
  );

  const editorState = getEditorContent();
  const editorLanguage =
    activeEditorTab === "visible-tests" ? "json" : language;

  const classes = ["dh-challenge-ide", className].filter(Boolean).join(" ");

  return (
    <div className={classes} data-testid="challenge-ide">
      {/* Top bar */}
      <IDETopBar
        challengeTitle={challengeTitle}
        language={language}
        availableLanguages={availableLanguages}
        onLanguageChange={onLanguageChange}
        assignedAt={assignedAt}
        dueAt={dueAt}
        assessmentStatus={assessmentStatus}
        onAutoSubmit={onAutoSubmit}
        testsPassed={testsPassed}
        testsTotal={testsTotal}
        submitDisabled={timerLocked || submitting}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      {/* Main IDE content area */}
      <div className="dh-challenge-ide__content">
        {/* Outer horizontal split: Problem (left) | Editor+Terminal (right) */}
        <SplitPane
          orientation="horizontal"
          initialRatio={0.4}
          minRatio={0.2}
          maxRatio={0.7}
          storageKey="dh.ide.horizontal-split"
          data-testid="ide-horizontal-split"
        >
          {/* Left pane: Problem panel */}
          <ProblemPanel
            title={challengeTitle}
            descriptionMarkdown={descriptionMarkdown}
            testCases={testCases}
            submissions={submissions}
            onSubmissionClick={onSubmissionClick}
            className="dh-challenge-ide__problem"
          />

          {/* Right pane: Editor + Terminal (vertical split) */}
          <SplitPane
            orientation="vertical"
            initialRatio={0.65}
            minRatio={0.3}
            maxRatio={0.85}
            storageKey="dh.ide.vertical-split"
            data-testid="ide-vertical-split"
          >
            {/* Top: File tabs + Code editor */}
            <div className="dh-challenge-ide__editor-section">
              <FileTab
                onTabChange={handleTabChange}
                data-testid="ide-file-tabs"
              />
              <div className="dh-challenge-ide__editor-wrapper">
                <CandidateCodeEditor
                  value={editorState.value}
                  language={editorLanguage}
                  readOnly={editorState.readOnly}
                  onChange={handleEditorChange}
                />
              </div>
            </div>

            {/* Bottom: Terminal */}
            <Terminal
              rows={terminalRows}
              status={terminalStatus}
              className="dh-challenge-ide__terminal"
            />
          </SplitPane>
        </SplitPane>
      </div>

      {/* Submission progress modal */}
      <SubmissionProgressModal
        open={showSubmissionModal && submitting}
        step={submissionStep}
        error={submissionError}
        onClose={handleCloseModal}
      />
    </div>
  );
}

export default ChallengeIDE;

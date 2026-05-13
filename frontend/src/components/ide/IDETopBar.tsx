"use client";

import { useCallback } from "react";
import { Breadcrumb } from "@/components/ui/navigation/Breadcrumb";
import { Select } from "@/components/ui/primitives/Select";
import { Button } from "@/components/ui/primitives/Button";
import { AssessmentTimer } from "@/components/ide/AssessmentTimer";
import { ProgressBar } from "@/components/ui/primitives/ProgressBar";

import "@/styles/components/ide-top-bar.css";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export interface IDETopBarProps {
  /** Challenge title for breadcrumb display */
  challengeTitle: string;
  /** Currently selected language */
  language: string;
  /** Available languages for the challenge */
  availableLanguages: string[];
  /** Callback when language changes */
  onLanguageChange: (language: string) => void;
  /** Timer: assignment start timestamp (ms) */
  assignedAt: number;
  /** Timer: due timestamp (ms) */
  dueAt: number;
  /** Assessment status (e.g. 'IN_PROGRESS', 'LOCKED') */
  assessmentStatus: string;
  /** Callback when timer expires (auto-submit) */
  onAutoSubmit?: () => void;
  /** Progress: number of tests passed */
  testsPassed: number;
  /** Progress: total number of visible tests */
  testsTotal: number;
  /** Whether the submit button is disabled (timer locked/expired) */
  submitDisabled: boolean;
  /** Whether submission is in progress */
  submitting: boolean;
  /** Callback when submit button is clicked */
  onSubmit: () => void;
  /** Additional CSS class */
  className?: string;
}

/* --------------------------------------------------------------------------
   Language options helper
   -------------------------------------------------------------------------- */

function buildLanguageOptions(languages: string[]) {
  return languages.map((lang) => ({
    value: lang,
    label: lang.charAt(0).toUpperCase() + lang.slice(1),
  }));
}

/* --------------------------------------------------------------------------
   IDETopBar Component
   -------------------------------------------------------------------------- */

/**
 * Top bar for the LeetCode-style IDE.
 *
 * Layout: BreadcrumbBack | LanguageSelector | AssessmentTimer | ProgressIndicator | SubmitButton
 *
 * The submit button is disabled when the timer is locked or expired.
 *
 * Requirements: 4.1, 4.3, 4.5, 4.7
 */
export function IDETopBar({
  challengeTitle,
  language,
  availableLanguages,
  onLanguageChange,
  assignedAt,
  dueAt,
  assessmentStatus,
  onAutoSubmit,
  testsPassed,
  testsTotal,
  submitDisabled,
  submitting,
  onSubmit,
  className = "",
}: IDETopBarProps) {
  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onLanguageChange(e.target.value);
    },
    [onLanguageChange]
  );

  const progressPercent =
    testsTotal > 0 ? Math.round((testsPassed / testsTotal) * 100) : 0;

  const classes = ["dh-ide-top-bar", className].filter(Boolean).join(" ");

  return (
    <header className={classes} data-testid="ide-top-bar">
      {/* Left section: Breadcrumb back */}
      <div className="dh-ide-top-bar__left">
        <Breadcrumb
          items={[
            { label: "Challenges", href: "/challenges" },
            { label: challengeTitle },
          ]}
          data-testid="ide-breadcrumb"
        />
      </div>

      {/* Center section: Language selector + Timer + Progress */}
      <div className="dh-ide-top-bar__center">
        <Select
          id="ide-language-selector"
          selectSize="sm"
          options={buildLanguageOptions(availableLanguages)}
          value={language}
          onChange={handleLanguageChange}
          aria-label="Select programming language"
          className="dh-ide-top-bar__language-select"
        />

        <AssessmentTimer
          assignedAt={assignedAt}
          dueAt={dueAt}
          status={assessmentStatus}
          onAutoSubmit={onAutoSubmit}
          className="dh-ide-top-bar__timer"
        />

        <div
          className="dh-ide-top-bar__progress"
          aria-label={`${testsPassed} of ${testsTotal} tests passed`}
        >
          <ProgressBar
            value={progressPercent}
            size="sm"
            aria-label="Test progress"
            className="dh-ide-top-bar__progress-bar"
          />
          <span className="dh-ide-top-bar__progress-label">
            {testsPassed}/{testsTotal}
          </span>
        </div>
      </div>

      {/* Right section: Submit button */}
      <div className="dh-ide-top-bar__right">
        <Button
          variant="primary"
          size="sm"
          disabled={submitDisabled}
          loading={submitting}
          onClick={onSubmit}
          aria-label="Submit solution"
          data-testid="ide-submit-btn"
        >
          Submit
        </Button>
      </div>
    </header>
  );
}

export default IDETopBar;

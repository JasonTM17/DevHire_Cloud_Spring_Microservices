"use client";

import { useState, useCallback, useRef, useMemo, type KeyboardEvent } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface SubmissionEntry {
  id: string;
  timestamp: string;
  verdict: "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Compile Error" | "Runtime Error";
  executionTimeMs: number;
  memoryKB: number;
  language: string;
}

export interface ProblemPanelProps {
  /** Problem title */
  title: string;
  /** Problem description in markdown format */
  descriptionMarkdown: string;
  /** Visible test cases */
  testCases: TestCase[];
  /** Submission history list */
  submissions: SubmissionEntry[];
  /** Callback when a submission row is clicked */
  onSubmissionClick?: (submissionId: string) => void;
  /** Additional CSS class */
  className?: string;
}

type TabId = "description" | "test-cases" | "submissions";

interface TabDef {
  id: TabId;
  label: string;
}

const TABS: TabDef[] = [
  { id: "description", label: "Description" },
  { id: "test-cases", label: "Test Cases" },
  { id: "submissions", label: "Submissions" },
];

/* --------------------------------------------------------------------------
   Verdict styling helper
   -------------------------------------------------------------------------- */

const VERDICT_CLASS_MAP: Record<SubmissionEntry["verdict"], string> = {
  Accepted: "dh-problem-panel__verdict--accepted",
  "Wrong Answer": "dh-problem-panel__verdict--wrong",
  "Time Limit Exceeded": "dh-problem-panel__verdict--tle",
  "Compile Error": "dh-problem-panel__verdict--compile-error",
  "Runtime Error": "dh-problem-panel__verdict--runtime-error",
};

/* --------------------------------------------------------------------------
   DescriptionTab — renders sanitized markdown
   -------------------------------------------------------------------------- */

function DescriptionTab({ title, markdown }: { title: string; markdown: string }) {
  const sanitizedHtml = useMemo(() => {
    const rawHtml = marked.parse(markdown, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [markdown]);

  return (
    <div className="dh-problem-panel__description">
      <h2 className="dh-problem-panel__title">{title}</h2>
      <div
        className="dh-problem-panel__markdown"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
   TestCasesTab — visible test cases table
   -------------------------------------------------------------------------- */

function TestCasesTab({ testCases }: { testCases: TestCase[] }) {
  if (testCases.length === 0) {
    return (
      <div className="dh-problem-panel__empty">
        <p>No visible test cases available.</p>
      </div>
    );
  }

  return (
    <div className="dh-problem-panel__test-cases">
      <table className="dh-problem-panel__table" aria-label="Visible test cases">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Input</th>
            <th scope="col">Expected Output</th>
            <th scope="col">Explanation</th>
          </tr>
        </thead>
        <tbody>
          {testCases.map((tc, idx) => (
            <tr key={tc.id}>
              <td>{idx + 1}</td>
              <td>
                <pre className="dh-problem-panel__code-cell">{tc.input}</pre>
              </td>
              <td>
                <pre className="dh-problem-panel__code-cell">{tc.expectedOutput}</pre>
              </td>
              <td>{tc.explanation ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------------------
   SubmissionsTab — submission history list
   -------------------------------------------------------------------------- */

function SubmissionsTab({
  submissions,
  onSubmissionClick,
}: {
  submissions: SubmissionEntry[];
  onSubmissionClick?: (id: string) => void;
}) {
  if (submissions.length === 0) {
    return (
      <div className="dh-problem-panel__empty">
        <p>No submissions yet.</p>
      </div>
    );
  }

  return (
    <div className="dh-problem-panel__submissions">
      <table className="dh-problem-panel__table" aria-label="Submission history">
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Verdict</th>
            <th scope="col">Runtime</th>
            <th scope="col">Memory</th>
            <th scope="col">Language</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((sub) => (
            <tr
              key={sub.id}
              className="dh-problem-panel__submission-row"
              onClick={() => onSubmissionClick?.(sub.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSubmissionClick?.(sub.id);
                }
              }}
              tabIndex={onSubmissionClick ? 0 : undefined}
              role={onSubmissionClick ? "button" : undefined}
              aria-label={`Submission: ${sub.verdict} at ${sub.timestamp}`}
            >
              <td>{sub.timestamp}</td>
              <td>
                <span
                  className={`dh-problem-panel__verdict ${VERDICT_CLASS_MAP[sub.verdict]}`}
                >
                  {sub.verdict}
                </span>
              </td>
              <td>{sub.executionTimeMs}ms</td>
              <td>{sub.memoryKB}KB</td>
              <td>{sub.language}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------------------------------
   ProblemPanel component
   -------------------------------------------------------------------------- */

/**
 * Left pane of the LeetCode-style IDE.
 * Contains three tabs: Description (markdown), Test Cases (table), Submissions (list).
 *
 * Uses proper ARIA roles (tablist/tab/tabpanel) for accessibility.
 *
 * Requirements: 4.1, 4.7
 */
export function ProblemPanel({
  title,
  descriptionMarkdown,
  testCases,
  submissions,
  onSubmissionClick,
  className = "",
}: ProblemPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("description");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      let nextIndex = currentIndex;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % TABS.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = TABS.length - 1;
      } else {
        return;
      }

      const nextTab = TABS[nextIndex];
      if (nextTab) {
        handleTabChange(nextTab.id);
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [activeTab, handleTabChange]
  );

  const classes = ["dh-problem-panel", className].filter(Boolean).join(" ");

  return (
    <div className={classes} data-testid="problem-panel">
      {/* Tab list */}
      <div
        role="tablist"
        aria-label="Problem panel tabs"
        className="dh-problem-panel__tablist"
        onKeyDown={handleKeyDown}
      >
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[index] = el; }}
            role="tab"
            id={`problem-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`problem-tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`dh-problem-panel__tab ${activeTab === tab.id ? "dh-problem-panel__tab--active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`problem-tabpanel-${activeTab}`}
        aria-labelledby={`problem-tab-${activeTab}`}
        className="dh-problem-panel__content"
        tabIndex={0}
      >
        {activeTab === "description" && (
          <DescriptionTab title={title} markdown={descriptionMarkdown} />
        )}
        {activeTab === "test-cases" && (
          <TestCasesTab testCases={testCases} />
        )}
        {activeTab === "submissions" && (
          <SubmissionsTab
            submissions={submissions}
            onSubmissionClick={onSubmissionClick}
          />
        )}
      </div>
    </div>
  );
}

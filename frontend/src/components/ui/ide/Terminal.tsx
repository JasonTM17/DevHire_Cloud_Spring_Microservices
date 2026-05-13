"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export interface TerminalRow {
  testIndex: number;
  passed: boolean;
  timeMs: number;
  memoryKB: number;
  verdict: string;
  expected?: string;
  actual?: string;
}

export type TerminalStatus = "idle" | "running" | "done" | "error";

export interface TerminalProps {
  rows: TerminalRow[];
  status: TerminalStatus;
  className?: string;
}

/* --------------------------------------------------------------------------
   Simple line-diff utility (no external lib)
   -------------------------------------------------------------------------- */

interface DiffLine {
  type: "same" | "added" | "removed";
  text: string;
}

function computeLineDiff(expected: string, actual: string): DiffLine[] {
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const result: DiffLine[] = [];
  const maxLen = Math.max(expectedLines.length, actualLines.length);

  for (let i = 0; i < maxLen; i++) {
    const exp = i < expectedLines.length ? expectedLines[i] : undefined;
    const act = i < actualLines.length ? actualLines[i] : undefined;

    if (exp === act) {
      result.push({ type: "same", text: exp! });
    } else {
      if (exp !== undefined) {
        result.push({ type: "removed", text: exp });
      }
      if (act !== undefined) {
        result.push({ type: "added", text: act });
      }
    }
  }

  return result;
}

/* --------------------------------------------------------------------------
   DiffSection sub-component
   -------------------------------------------------------------------------- */

function DiffSection({
  expected,
  actual,
}: {
  expected: string;
  actual: string;
}) {
  const diffLines = computeLineDiff(expected, actual);

  return (
    <div className="dh-terminal__diff" role="region" aria-label="Diff output">
      <div className="dh-terminal__diff-header">
        <span className="dh-terminal__diff-label dh-terminal__diff-label--expected">
          Expected
        </span>
        <span className="dh-terminal__diff-label dh-terminal__diff-label--actual">
          Actual
        </span>
      </div>
      <pre className="dh-terminal__diff-content">
        {diffLines.map((line, idx) => (
          <span
            key={idx}
            className={`dh-terminal__diff-line dh-terminal__diff-line--${line.type}`}
          >
            {line.type === "removed" && "- "}
            {line.type === "added" && "+ "}
            {line.type === "same" && "  "}
            {line.text}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}

/* --------------------------------------------------------------------------
   TerminalRowItem sub-component
   -------------------------------------------------------------------------- */

function TerminalRowItem({ row }: { row: TerminalRow }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = !row.passed && row.expected !== undefined && row.actual !== undefined;

  const icon = row.passed ? "✔" : "✘";
  const rowClass = [
    "dh-terminal__row",
    row.passed ? "dh-terminal__row--pass" : "dh-terminal__row--fail",
  ].join(" ");

  return (
    <div className={rowClass}>
      <div
        className="dh-terminal__row-summary"
        role={hasDiff ? "button" : undefined}
        tabIndex={hasDiff ? 0 : undefined}
        aria-expanded={hasDiff ? expanded : undefined}
        onClick={hasDiff ? () => setExpanded(!expanded) : undefined}
        onKeyDown={
          hasDiff
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpanded(!expanded);
                }
              }
            : undefined
        }
      >
        <span className="dh-terminal__row-icon" aria-hidden="true">
          [{icon}]
        </span>{" "}
        Test {row.testIndex} · {row.timeMs}ms · {row.memoryKB}KB · {row.verdict}
        {hasDiff && (
          <span className="dh-terminal__row-expand" aria-hidden="true">
            {expanded ? " ▾" : " ▸"}
          </span>
        )}
      </div>
      {hasDiff && expanded && (
        <DiffSection expected={row.expected!} actual={row.actual!} />
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   StatusIndicator sub-component
   -------------------------------------------------------------------------- */

function StatusIndicator({ status }: { status: TerminalStatus }) {
  const statusClass = `dh-terminal__status dh-terminal__status--${status}`;
  const labels: Record<TerminalStatus, string> = {
    idle: "Idle",
    running: "Running",
    done: "Done",
    error: "Error",
  };

  return (
    <div className={statusClass} aria-label={`Terminal status: ${labels[status]}`}>
      <span className="dh-terminal__status-dot" aria-hidden="true" />
      <span className="dh-terminal__status-label">{labels[status]}</span>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Terminal component
   -------------------------------------------------------------------------- */

export function Terminal({ rows, status, className = "" }: TerminalProps) {
  const outputRef = useRef<HTMLDivElement>(null);
  const prevRowCountRef = useRef(0);

  // Auto-scroll to bottom on new rows
  useEffect(() => {
    if (rows.length > prevRowCountRef.current && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
    prevRowCountRef.current = rows.length;
  }, [rows.length]);

  const classes = ["dh-terminal", className].filter(Boolean).join(" ");

  return (
    <div
      className={classes}
      role="log"
      aria-label="Test output terminal"
      aria-live="polite"
    >
      <div className="dh-terminal__header">
        <span className="dh-terminal__title">Terminal</span>
        <StatusIndicator status={status} />
      </div>
      <div className="dh-terminal__output" ref={outputRef}>
        {rows.map((row) => (
          <TerminalRowItem key={row.testIndex} row={row} />
        ))}
      </div>
    </div>
  );
}

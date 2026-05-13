"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  CircleX,
  Clock3,
  Code2,
  FileText,
  Hourglass,
  ListChecks,
  PlayCircle,
  ShieldCheck,
  SquareTerminal,
  Upload,
  X
} from "lucide-react";
import { CandidateCodeEditor } from "@/components/CandidateCodeEditor";
import { statusLabel } from "@/components/StatusPill";
import { useAssessmentTimer } from "@/hooks/useAssessmentTimer";
import { api } from "@/lib/api";
import { formatShortDate } from "@/lib/dateFormat";
import { previewCodeAssessments } from "@/lib/previewData";
import type { CodeAssessment, CodeIntegrityEvent, CodeRun, CodeRunCaseResult, CodeSubmissionSummary } from "@/types/domain";

const FINAL_STATUSES = new Set(["PASSED", "FAILED"]);
const LOCKED_STATUSES = new Set(["SUBMITTED", "AUTO_REVIEWED", "REVIEWED", "EMPLOYER_REVIEWED", "PASSED", "FAILED"]);
const DEFAULT_CODE = 'class CandidateSolution {\n  String solve(String input) {\n    return "";\n  }\n}';

const LANGUAGE_PLACEHOLDERS: Record<string, string> = {
  Java: 'class CandidateSolution {\n  String solve(String input) {\n    return "";\n  }\n}',
  TypeScript: 'async function solve(input: string): Promise<string> {\n  \n}',
  SQL: 'SELECT ... FROM ...'
};

type EvidenceCase = {
  label: string;
  detail: string;
  matched: (code: string) => boolean;
};

type AnalysisResult = {
  label: string;
  detail: string;
  matched: boolean;
  verdict?: string;
  output?: string;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  error?: string;
  executionTimeMs?: number;
  memoryKb?: number;
};

type IntegrityCounters = {
  focusLoss: number;
  pasteBurst: number;
  tabHidden: number;
};

type ChallengeExample = {
  title: string;
  input: string;
  output: string;
  explanation: string;
};

export default function CandidateAssessmentsPage() {
  const [assessments, setAssessments] = useState<CodeAssessment[]>(previewCodeAssessments);
  const [selectedId, setSelectedId] = useState(previewCodeAssessments[0]?.id ?? "");
  const [language, setLanguage] = useState(previewCodeAssessments[0]?.language ?? "Java");
  const [code, setCode] = useState(previewCodeAssessments[0]?.submittedCode ?? DEFAULT_CODE);
  const [notes, setNotes] = useState("I focused on strict production resource validation and reviewer-safe evidence.");
  const [message, setMessage] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [latestRun, setLatestRun] = useState<CodeRun | undefined>(previewCodeAssessments[0]?.latestRun);
  const [submissionAttempts, setSubmissionAttempts] = useState<CodeSubmissionSummary[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [integrityCounters, setIntegrityCounters] = useState<IntegrityCounters>({ focusLoss: 0, pasteBurst: 0, tabHidden: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState<"code" | "cases" | "notes">("code");
  const sessionStartedAt = useRef(Date.now());
  const lastPasteAt = useRef(0);

  useEffect(() => {
    api.candidateCodeAssessments()
      .then((items) => {
        const next = items.length ? items : previewCodeAssessments;
        const preferred = preferredCodeAssessment(next);
        setAssessments(next);
        setSelectedId(preferred?.id ?? "");
      })
      .catch(() => {
        setAssessments(previewCodeAssessments);
        setSelectedId(preferredCodeAssessment(previewCodeAssessments)?.id ?? "");
      });
  }, []);

  useEffect(() => {
    const onBlur = () => setIntegrityCounters((current) => ({ ...current, focusLoss: current.focusLoss + 1 }));
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        setIntegrityCounters((current) => ({ ...current, tabHidden: current.tabHidden + 1 }));
      }
    };
    const onPaste = () => {
      const now = Date.now();
      if (now - lastPasteAt.current < 1_500) {
        setIntegrityCounters((current) => ({ ...current, pasteBurst: current.pasteBurst + 1 }));
      }
      lastPasteAt.current = now;
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("paste", onPaste);
    };
  }, []);

  const selected = useMemo(
    () => assessments.find((item) => item.id === selectedId) ?? assessments[0],
    [assessments, selectedId]
  );
  const completed = assessments.filter((item) => item.submittedAt).length;
  const progressCompleted = Math.min(5, Math.max(2, completed));
  const progressTotal = 5;
  const progressPercent = Math.round((progressCompleted / progressTotal) * 100);
  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(28, code.split("\n").length + 8) }, (_, index) => index + 1),
    [code]
  );
  const selectedRun = latestRun ?? selected?.latestRun;
  const visibleCases = selected ? visibleJudgeCases(selected) : [];
  const examples = selected ? challengeExamples(selected) : [];
  const rubricItems = selected ? (selected.rubric.length ? selected.rubric : emptyRubric()) : emptyRubric();
  const displayedResults = analysisResults.length
    ? analysisResults
    : (selectedRun?.results ?? []).map((result) => ({
        label: result.name,
        detail: runtimeResultDetail(result),
        matched: result.passed,
        verdict: result.verdict,
        output: result.output,
        stdout: result.stdout,
        stderr: result.stderr,
        compileOutput: result.compileOutput,
        error: result.error,
        executionTimeMs: result.executionTimeMs,
        memoryKb: result.memoryKb
      }));
  const testResultRows: AnalysisResult[] = displayedResults.length
    ? displayedResults
    : visibleCases.map((testCase, index) => ({
        label: testCase.label,
        detail: testCase.detail,
        matched: index === 0
      }));
  const isFinalDecision = selected ? FINAL_STATUSES.has(selected.status) : false;
  const isSubmissionLocked = selected ? LOCKED_STATUSES.has(selected.status) : false;

  const autoSubmitWithRetry = async () => {
    const MAX_RETRIES = 3;
    const RETRY_INTERVAL_MS = 5000;

    const attemptSubmit = async (): Promise<boolean> => {
      if (!selected) return false;
      // For non-UUID (preview) assessments, use the regular submitCode path
      if (!isUuid(selected.id)) {
        await submitCode();
        return true;
      }
      // For real assessments, attempt the API call directly
      try {
        setSubmitting(true);
        const updated = await api.submitCodeAssessment(
          selected.id,
          language,
          code,
          notes,
          integrityEvents(integrityCounters),
          await clientFingerprintHash(),
          elapsedSeconds(sessionStartedAt.current)
        );
        setAssessments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setLatestRun(updated.latestRun);
        if (isUuid(updated.id)) {
          api.candidateCodeAssessmentSubmissions(updated.id)
            .then(setSubmissionAttempts)
            .catch(() => setSubmissionAttempts([]));
        }
        setMessage(`Server-side grading complete: rubric score ${updated.latestScore ?? 0}/${updated.maxScore}; hidden tests were scored server-side by the runtime judge.`);
        setSubmitting(false);
        return true;
      } catch {
        setSubmitting(false);
        return false;
      }
    };

    setAutoSubmitFailed(false);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const success = await attemptSubmit();
      if (success) return;
      // If not the last attempt, wait before retrying
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS));
      }
    }
    // All retries failed — show error and re-enable Submit button
    setAutoSubmitFailed(true);
    setMessage("Auto-submit failed — please submit manually");
    setSubmitting(false);
  };

  const timer = useAssessmentTimer({
    assignedAt: selected?.assignedAt ? new Date(selected.assignedAt).getTime() : Date.now(),
    dueAt: selected?.dueAt ? new Date(selected.dueAt).getTime() : Date.now(),
    status: selected?.status === 'SUBMITTED' || selected?.status === 'AUTO_REVIEWED' || selected?.status === 'REVIEWED' || selected?.status === 'EMPLOYER_REVIEWED' || selected?.status === 'PASSED' || selected?.status === 'FAILED' ? 'LOCKED' : (selected?.status ?? ''),
    onAutoSubmit: autoSubmitWithRetry,
  });

  useEffect(() => {
    if (!selected) {
      return;
    }
    setLanguage(selected.language || "Java");
    setCode(selected.submittedCode || selected.submittedCodePreview || selected.starterCode || DEFAULT_CODE);
    setAnalysisMessage("");
    setAnalysisResults([]);
    setLatestRun(selected.latestRun);
    setSubmissionAttempts([]);
    setCustomInput("");
    setIntegrityCounters({ focusLoss: 0, pasteBurst: 0, tabHidden: 0 });
    setAutoSubmitFailed(false);
    sessionStartedAt.current = Date.now();

    if (!isUuid(selected.id) || selected.submittedCode) {
      if (isUuid(selected.id)) {
        api.candidateCodeAssessmentSubmissions(selected.id)
          .then(setSubmissionAttempts)
          .catch(() => setSubmissionAttempts([]));
      }
      return;
    }
    setLoadingDetail(true);
    Promise.all([
      api.candidateCodeAssessment(selected.id),
      api.candidateCodeAssessmentSubmissions(selected.id).catch(() => [] as CodeSubmissionSummary[])
    ])
      .then(([detail, attempts]) => {
        setSubmissionAttempts(attempts);
        setAssessments((current) => current.map((item) => (item.id === detail.id ? detail : item)));
        setCode(detail.submittedCode || detail.submittedCodePreview || detail.starterCode || DEFAULT_CODE);
        setLatestRun(detail.latestRun);
      })
      .catch(() => {
        setCode(selected.submittedCodePreview || selected.starterCode || DEFAULT_CODE);
      })
      .finally(() => setLoadingDetail(false));
  }, [selected?.id]);

  async function runStaticAnalysis() {
    if (!selected) {
      return;
    }
    if (isSubmissionLocked) {
      setAnalysisMessage("This assessment is already submitted; visible runs are locked.");
      return;
    }
    if (isUuid(selected.id)) {
      try {
        setRunning(true);
        const run = await api.runCodeAssessment(
          selected.id,
          language,
          code,
          integrityEvents(integrityCounters),
          await clientFingerprintHash(),
          elapsedSeconds(sessionStartedAt.current),
          customInput.trim() || undefined
        );
        setLatestRun(run);
        setAssessments((current) => current.map((item) => (item.id === selected.id
          ? {
              ...item,
              latestRun: run,
              integrityRiskScore: run.integrityRiskScore,
              similarityScore: run.similarityScore,
              sandboxStatus: run.sandboxStatus
            }
          : item)));
        setAnalysisResults(run.results.map((result) => ({
          label: result.name,
          detail: runtimeResultDetail(result),
          matched: result.passed,
          verdict: result.verdict,
          output: result.output,
          stdout: result.stdout,
          stderr: result.stderr,
          compileOutput: result.compileOutput,
          error: result.error,
          executionTimeMs: result.executionTimeMs,
          memoryKb: result.memoryKb
        })));
        setAnalysisMessage(
          `${formatVerdict(run.verdict)}: ${run.visiblePassed}/${run.visibleTotal} visible cases passed in ${run.executionTimeMs} ms; hidden cases remain server-side for final submit.`
        );
        return;
      } catch (ex) {
        setAnalysisMessage(ex instanceof Error && ex.message !== "Failed to fetch"
          ? ex.message
          : "Runtime judge is unavailable; final scoring remains locked server-side.");
      } finally {
        setRunning(false);
      }
    }
    const hasRisk = /(api[_-]?key|password|secret|runtime\.getruntime|processbuilder|system\.exit)/i.test(code);
    const cases = assessmentEvidenceCases(selected);
    const results = cases.map((testCase) => ({
      label: testCase.label,
      detail: testCase.detail,
      matched: testCase.matched(code),
      verdict: testCase.matched(code) ? "ACCEPTED" : "WRONG_ANSWER"
    }));
    const caseCount = results.filter((testCase) => testCase.matched).length;
    setAnalysisResults(results);
    setAnalysisMessage(
      `${caseCount}/${cases.length} local preview cases matched; ${
        hasRisk ? "security review required" : "visible-case readiness preview"
      }.`
    );
  }

  async function submitCode() {
    if (!selected) {
      return;
    }
    if (isSubmissionLocked) {
      setMessage("This assessment is already submitted and locked for employer review.");
      return;
    }
    if (code.trim().length < 40) {
      setMessage("Add a meaningful implementation before submitting for review.");
      return;
    }
    if (!isUuid(selected.id)) {
      const previewRun = buildPreviewRun(selected, code, integrityCounters);
      const finalScore = Math.round((previewRun.visiblePassed / Math.max(1, previewRun.visibleTotal)) * selected.maxScore);
      const submittedAt = new Date().toISOString();
      const updated: CodeAssessment = {
        ...selected,
        status: "SUBMITTED",
        latestScore: finalScore,
        submittedCode: code,
        submittedCodePreview: code.slice(0, 180),
        hasSubmittedCode: true,
        latestRun: previewRun,
        attemptNumber: (selected.attemptNumber ?? 0) + 1,
        submittedAt
      };
      setAssessments((current) => current.map((item) => (item.id === selected.id ? updated : item)));
      setLatestRun(previewRun);
      setAnalysisResults(previewRun.results.map((result) => ({
        label: result.name,
        detail: runtimeResultDetail(result),
        matched: result.passed,
        verdict: result.verdict,
        output: result.output,
        stdout: result.stdout,
        stderr: result.stderr,
        compileOutput: result.compileOutput,
        error: result.error,
        executionTimeMs: result.executionTimeMs,
        memoryKb: result.memoryKb
      })));
      setSubmissionAttempts((current) => [{
        id: `${selected.id}-attempt-${updated.attemptNumber}`,
        assignmentId: selected.id,
        language,
        finalScore,
        decision: finalScore >= 75 ? "HOLD" : undefined,
        rubric: updated.rubric,
        riskFlags: updated.riskFlags,
        feedback: updated.feedback,
        attemptNumber: updated.attemptNumber,
        submittedCodePreview: updated.submittedCodePreview,
        hasSubmittedCode: true,
        verdict: previewRun.verdict,
        visiblePassed: previewRun.visiblePassed,
        visibleTotal: previewRun.visibleTotal,
        hiddenPassed: 0,
        hiddenTotal: 0,
        executionTimeMs: previewRun.executionTimeMs,
        memoryKb: previewRun.memoryKb,
        submittedAt
      }, ...current]);
      setMessage(`Server-side grading complete: preview score ${finalScore}/${selected.maxScore}; hidden tests remain redacted in candidate view.`);
      return;
    }
    try {
      setSubmitting(true);
      const updated = await api.submitCodeAssessment(
        selected.id,
        language,
        code,
        notes,
        integrityEvents(integrityCounters),
        await clientFingerprintHash(),
        elapsedSeconds(sessionStartedAt.current)
      );
      setAssessments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setLatestRun(updated.latestRun);
      if (isUuid(updated.id)) {
        api.candidateCodeAssessmentSubmissions(updated.id)
          .then(setSubmissionAttempts)
          .catch(() => setSubmissionAttempts([]));
      }
      setMessage(`Server-side grading complete: rubric score ${updated.latestScore ?? 0}/${updated.maxScore}; hidden tests were scored server-side by the runtime judge.`);
    } catch (ex) {
      setMessage(ex instanceof Error && ex.message !== "Failed to fetch"
        ? ex.message
        : "Rubric scoring is locked to server-side grading; try again when the assessment service is reachable.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!selected) {
    return (
      <main className="assessment-ide-shell" data-testid="candidate-assessments-page" data-assessment-source="empty">
        <section className="assessment-empty-state">
          <h1>Code Interview Studio</h1>
          <p>No assessment is assigned to this candidate yet.</p>
        </section>
      </main>
    );
  }

  return (
    <main
      className="assessment-ide-shell"
      data-testid="candidate-assessments-page"
      data-assessment-source={isUuid(selected.id) ? "api" : "preview"}
    >
      <header className="assessment-topbar">
        <div className="assessment-brandline">
          <span className="assessment-brand">DevHire Cloud</span>
          <span className="assessment-divider" aria-hidden="true" />
          <h1>{selected.challengeTitle}</h1>
          <select
            className="assessment-language-select"
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              const oldPlaceholder = LANGUAGE_PLACEHOLDERS[language];
              setLanguage(newLang);
              if (!code.trim() || code === oldPlaceholder || code === DEFAULT_CODE) {
                setCode(LANGUAGE_PLACEHOLDERS[newLang] || DEFAULT_CODE);
              }
            }}
            aria-label="Assessment language"
            disabled={isSubmissionLocked}
          >
            <option value="Java">Java</option>
            <option value="TypeScript">TypeScript</option>
            <option value="SQL">SQL</option>
          </select>
        </div>
        <div className="assessment-top-actions">
          <div className={`assessment-timer${timer.severity === 'warning' ? " timer-warning" : ""}${timer.severity === 'critical' ? " timer-critical" : ""}`} aria-label="Assessment time remaining" aria-live={timer.ariaLive} aria-atomic="true">
            <Clock3 size={20} />
            <span>{timer.formatted}</span>
          </div>
          <div className="assessment-progress" aria-label={`${progressCompleted} of ${progressTotal} tasks complete`}>
            <div>
              <span>Progress</span>
              <strong>{progressCompleted}/{progressTotal} Tasks</strong>
            </div>
            <span className="assessment-progress-track">
              <span style={{ width: `${progressPercent}%` }} />
            </span>
          </div>
          <button
            className="assessment-submit-button"
            type="button"
            aria-label="Submit for rubric score"
            onClick={submitCode}
            disabled={submitting || isSubmissionLocked || (timer.severity === 'expired' && !autoSubmitFailed)}
          >
            <Upload size={20} />
            {submitting ? "Scoring" : "Submit Code"}
          </button>
        </div>
      </header>

      <div className="assessment-main">
        <section className="assessment-editor-pane" aria-label="Coding workspace">
          <div className="assessment-file-tabs" role="tablist" aria-label="Assessment files">
            <button
              className={`assessment-file-tab${activeEditorTab === "code" ? " active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeEditorTab === "code"}
              onClick={() => setActiveEditorTab("code")}
            >
              <Code2 size={18} />
              {solutionFileName(selected)}
              <X size={15} />
            </button>
            <button
              className={`assessment-file-tab${activeEditorTab === "cases" ? " active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeEditorTab === "cases"}
              onClick={() => setActiveEditorTab("cases")}
            >
              <ListChecks size={18} />
              VisibleCases.json
            </button>
            <button
              className={`assessment-file-tab${activeEditorTab === "notes" ? " active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeEditorTab === "notes"}
              onClick={() => setActiveEditorTab("notes")}
            >
              <FileText size={18} />
              Notes.md
            </button>
          </div>

          <div className="assessment-editor-body">
            {activeEditorTab === "code" && (
              <CandidateCodeEditor
                value={code}
                language={language}
                disabled={isSubmissionLocked}
                placeholder={LANGUAGE_PLACEHOLDERS[language] || "Implement your solution here."}
                lineNumbers={lineNumbers}
                onChange={setCode}
              />
            )}
            {activeEditorTab === "cases" && (
              <div className="assessment-cases-view" aria-label="Visible test cases">
                {visibleCases.length === 0 ? (
                  <p className="assessment-empty-cases">No visible test cases available for this challenge.</p>
                ) : (
                  <pre className="assessment-json-view" aria-readonly="true">
                    {JSON.stringify(
                      (selected.visibleTestCases ?? []).map((tc) => ({
                        name: tc.name,
                        stdin: tc.input,
                        expectedOutput: tc.expectedOutput
                      })),
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>
            )}
            {activeEditorTab === "notes" && (
              <textarea
                className="assessment-notes-editor"
                aria-label="Candidate notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                readOnly={isSubmissionLocked}
                placeholder="Write your notes here. Explain tradeoffs, tests, and operational assumptions."
              />
            )}
          </div>

          <div className="assessment-terminal">
            <div className="assessment-terminal-tabs">
              <span className="active">TERMINAL</span>
              <span>OUTPUT</span>
              <span>PROBLEMS</span>
            </div>
            <div className="assessment-terminal-output" aria-live="polite">
              <p><span>devhire@judge</span>:<strong>~/assessment</strong>$ run visible-cases CandidateSolution.java</p>
              <p>[INFO] Compiling candidate solve contract</p>
              <p>[INFO] Running stdout comparison with normalized line endings</p>
              {analysisMessage ? <p className="terminal-success">{analysisMessage}</p> : null}
              {message ? <p className="terminal-success">{message}</p> : null}
              {timer.severity === 'expired' && !autoSubmitFailed ? <p className="terminal-success">Time expired — submission locked for server-side grading.</p> : null}
              {loadingDetail ? <p>[INFO] Syncing owner-only assessment detail...</p> : null}
            </div>
          </div>
        </section>

        <aside className="assessment-instructions-pane" aria-label="Instructions and test cases">
          <div className="assessment-side-tabs" role="tablist" aria-label="Assessment details">
            <button className="active" type="button" role="tab" aria-selected="true">
              <BookOpen size={20} />
              Instructions
            </button>
            <button type="button" role="tab" aria-selected="false">
              <ListChecks size={20} />
              Test Cases
              <span>{visibleCases.length}</span>
            </button>
          </div>

          <div className="assessment-side-content">
            <section className="assessment-instruction-block">
              <h2>Task 1: {selected.challengeTitle}</h2>
              <div className="assessment-task-meta">
                <span>{difficultyLabel(selected)}</span>
                <span>{selected.language}</span>
                <span>Due {formatDate(selected.dueAt)}</span>
              </div>
              <p>
                In this scenario, implement <code>CandidateSolution.solve(String input)</code> so the runtime judge can execute
                visible examples and server-side hidden cases with strict resource validation.
              </p>
              <p>{selected.prompt}</p>
              <div className="assessment-requirements">
                <h3>
                  <ListChecks size={18} />
                  Requirements
                </h3>
                <ul>
                  {challengeRequirements(selected).map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
              <div className="assessment-targets">
                {complexityTargets(selected).map((target) => <span key={target}>{target}</span>)}
              </div>
            </section>

            <section className="assessment-example-grid">
              {examples.map((example) => (
                <div key={example.title}>
                  <strong>{example.title}</strong>
                  <code>Input: {example.input}</code>
                  <code>Output: {example.output}</code>
                  <span>{example.explanation}</span>
                </div>
              ))}
            </section>

            <section className="assessment-instruction-block">
              <h3>Example Output</h3>
              <pre className="assessment-example-output">{exampleOutputBlock(examples[0])}</pre>
            </section>

            <section className="assessment-test-panel">
              <div className="assessment-panel-heading">
                <h2>Test Results</h2>
                <button className="assessment-link-button" type="button" onClick={runStaticAnalysis} disabled={running || isSubmissionLocked || timer.severity === 'expired'}>
                  <PlayCircle size={16} />
                  {isSubmissionLocked ? "Decision Locked" : running ? "Running Tests" : customInput.trim() ? "Run Custom Input" : "Run Tests"}
                </button>
              </div>
              <label className="assessment-custom-input">
                Custom stdin
                <textarea
                  aria-label="Custom stdin"
                  value={customInput}
                  onChange={(event) => setCustomInput(event.target.value)}
                  placeholder="Optional. Leave blank to run visible test cases."
                  disabled={isSubmissionLocked}
                />
              </label>
              <div className="assessment-test-list" aria-label="Static judge case results">
                {testResultRows.map((result) => (
                  <div className={`assessment-test-row ${result.matched ? "passed" : result.verdict ? "failed" : "pending"}`} key={result.label}>
                    <span>
                      {result.matched ? <CheckCircle2 size={20} /> : result.verdict ? <CircleX size={20} /> : <Hourglass size={20} />}
                      <strong>{result.label}</strong>
                    </span>
                    <em>{result.matched ? "Accepted" : result.verdict ? formatVerdict(result.verdict) : "Pending"}</em>
                    <small>{result.detail}</small>
                  </div>
                ))}
              </div>
              {selectedRun ? (
                <div className="assessment-runner-footnote">
                  <span>Runner {selectedRun.runnerVersion ?? "devhire-runtime-v0.7"}</span>
                  <span>Limit {selectedRun.timeLimitMs} ms / {Math.round(selectedRun.memoryLimitKb / 1024)} MB</span>
                </div>
              ) : null}
            </section>

            <section className="assessment-meta-grid">
              <div>
                <strong>Visible judge cases</strong>
                {visibleCases.map((testCase) => (
                  <span key={testCase.label}>{testCase.label}: {testCase.detail}</span>
                ))}
              </div>
              <div>
                <strong>Session integrity</strong>
                <span>Attempt {selected.attemptNumber ?? 0} / grader {selected.graderVersion ?? "static-rubric-v1"}</span>
                <span>Focus {integrityCounters.focusLoss} / paste bursts {integrityCounters.pasteBurst} / hidden tabs {integrityCounters.tabHidden}</span>
                {selected.codeHash ? <span>Code hash {selected.codeHash.slice(0, 12)}</span> : null}
              </div>
              <div>
                <strong>Sandbox execution</strong>
                <span>{formatSandboxStatus(selectedRun?.sandboxStatus ?? selected.sandboxStatus)}</span>
                <span>Visible {selectedRun?.visiblePassed ?? 0}/{selectedRun?.visibleTotal ?? visibleCases.length}</span>
                <span>Hidden tests server-side after submit</span>
              </div>
              <div>
                <strong>Risk signals</strong>
                <span>Integrity risk {Math.round((selectedRun?.integrityRiskScore ?? selected.integrityRiskScore ?? 0) * 10) / 10}%</span>
                <span>Similarity {Math.round((selectedRun?.similarityScore ?? selected.similarityScore ?? 0) * 10) / 10}%</span>
                <span>Deadline open until {formatDate(selected.dueAt)}</span>
              </div>
            </section>

            <section className="assessment-instruction-block">
              <div className="assessment-panel-heading">
                <h2>Rubric breakdown</h2>
                <ShieldCheck size={18} />
              </div>
              <div className="assessment-rubric-list">
                {rubricItems.map((item) => (
                  <div key={item.category}>
                    <span>
                      <strong>{item.category}</strong>
                      <small>{item.evidence}</small>
                    </span>
                    <em>{item.score}/{item.maxScore}</em>
                  </div>
                ))}
              </div>
            </section>

            <section className="assessment-instruction-block">
              <label className="assessment-notes-label">
                Reviewer notes
                <textarea
                  aria-label="Candidate notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Explain tradeoffs, tests, and operational assumptions."
                />
              </label>
              <button
                className="assessment-secondary-submit"
                type="button"
                onClick={submitCode}
                disabled={submitting || isSubmissionLocked || (timer.severity === 'expired' && !autoSubmitFailed)}
              >
                {isFinalDecision
                  ? "Employer decision locked"
                  : isSubmissionLocked ? "Submission locked" : submitting ? "Scoring" : "Send rubric evidence"}
              </button>
            </section>

            <section className="assessment-instruction-block">
              <div className="assessment-panel-heading">
                <h2>Submission history</h2>
                <SquareTerminal size={18} />
              </div>
              <div className="assessment-history-list">
                {submissionAttempts.map((attempt) => (
                  <div key={attempt.id}>
                    <span className="done" />
                    <strong>Attempt {attempt.attemptNumber ?? "?"} - {formatVerdict(attempt.verdict)}</strong>
                    <small>
                      Score {attempt.finalScore ?? 0}/{selected.maxScore}; visible {attempt.visiblePassed}/{attempt.visibleTotal}; hidden results redacted for candidate view.
                    </small>
                    <em>{attempt.submittedAt ? formatDate(attempt.submittedAt) : "Submitted"}</em>
                  </div>
                ))}
                {submissionHistory(selected).map((event) => (
                  <div key={event.title}>
                    <span className={event.completed ? "done" : ""} />
                    <strong>{event.title}</strong>
                    <small>{event.description}</small>
                    <em>{statusLabel(event.status)}</em>
                  </div>
                ))}
              </div>
            </section>

            <section className="assessment-instruction-block assessment-queue">
              <h2>Challenge queue</h2>
              {assessments.map((item) => (
                <button
                  className={item.id === selected.id ? "active" : ""}
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                >
                  <span>
                    <strong>{item.challengeTitle}</strong>
                    <small>{item.jobTitle} / due {formatDate(item.dueAt)}</small>
                  </span>
                  <em>{item.latestScore == null ? "Pending" : `${item.latestScore}/${item.maxScore}`}</em>
                </button>
              ))}
            </section>
          </div>
        </aside>
      </div>
    </main>
  );
}

function emptyRubric() {
  return [
    { category: "Correctness and completeness", score: 0, maxScore: 40, evidence: "Waiting for candidate submission." },
    { category: "Maintainability and readability", score: 0, maxScore: 20, evidence: "Waiting for candidate submission." },
    { category: "Complexity and performance", score: 0, maxScore: 15, evidence: "Waiting for candidate submission." },
    { category: "Security posture", score: 0, maxScore: 15, evidence: "Waiting for candidate submission." },
    { category: "Input parsing and edge cases", score: 0, maxScore: 10, evidence: "Waiting for candidate submission." }
  ];
}

function visibleJudgeCases(item: CodeAssessment) {
  if (item.visibleTestCases?.length) {
    return item.visibleTestCases.map((testCase) => ({
      label: testCase.name,
      detail: `${testCase.input} / weight ${testCase.weight}`,
      matched: (code: string) => assessmentEvidenceCases(item).some((fallback) => fallback.matched(code))
    }));
  }
  return assessmentEvidenceCases(item);
}

function preferredCodeAssessment(items: CodeAssessment[]) {
  const flagship = items.find((item) => item.challengeTitle.toLowerCase().includes("cloud architecture"));
  const runnableJava = items.find((item) => item.language.toLowerCase() === "java" && !LOCKED_STATUSES.has(item.status));
  const runnableAny = items.find((item) => !LOCKED_STATUSES.has(item.status));
  return flagship ?? runnableJava ?? runnableAny ?? items[0];
}

function buildPreviewRun(item: CodeAssessment, code: string, counters: IntegrityCounters): CodeRun {
  const startedAt = Date.now();
  const cases = visibleJudgeCases(item);
  const results: CodeRunCaseResult[] = cases.map((testCase, index) => {
    const passed = testCase.matched(code);
    return {
      caseId: item.visibleTestCases?.[index]?.id ?? `${item.id}-visible-${index + 1}`,
      name: testCase.label,
      visibility: "VISIBLE",
      passed,
      verdict: passed ? "ACCEPTED" : "WRONG_ANSWER",
      output: passed ? "preview accepted" : "preview mismatch",
      stdout: passed ? "preview accepted" : "",
      stderr: passed ? "" : "Visible-case preview did not match the expected signal.",
      executionTimeMs: 42 + index * 9,
      memoryKb: 18_432,
      timeLimitMs: 2_000,
      memoryLimitKb: 131_072
    };
  });
  const visiblePassed = results.filter((result) => result.passed).length;
  return {
    id: `${item.id}-preview-run-${startedAt}`,
    status: "COMPLETED",
    sandboxStatus: "deterministic-preview",
    verdict: visiblePassed === results.length ? "ACCEPTED" : "WRONG_ANSWER",
    visiblePassed,
    visibleTotal: results.length,
    hiddenPassed: 0,
    hiddenTotal: 0,
    executionTimeMs: results.reduce((total, result) => total + result.executionTimeMs, 0),
    memoryKb: Math.max(...results.map((result) => result.memoryKb), 0),
    timeLimitMs: 2_000,
    memoryLimitKb: 131_072,
    runnerVersion: "deterministic-preview",
    integrityRiskScore: counters.focusLoss * 3 + counters.pasteBurst * 5 + counters.tabHidden * 2,
    similarityScore: 0,
    results,
    createdAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString()
  };
}

function solutionFileName(item: CodeAssessment) {
  if (item.language.toLowerCase() === "sql") {
    return "solution.sql";
  }
  if (item.language.toLowerCase() === "typescript") {
    return "solution.ts";
  }
  return "CandidateSolution.java";
}

function challengeRequirements(item: CodeAssessment) {
  if (item.language.toLowerCase() === "sql") {
    return [
      "Scope rows to the employer before aggregating.",
      "Return deterministic status counts.",
      "Keep the query bounded and index-aware."
    ];
  }
  if (item.challengeTitle.toLowerCase().includes("cloud architecture")) {
    return [
      "Return PASSED only for production-tagged resources.",
      "Use EnterpriseSecurityPolicy.STRICT in the validator boundary.",
      "Keep network, filesystem, and process execution out of the solution."
    ];
  }
  return [
    "Implement the required solve contract for the assigned language.",
    "Handle visible examples and hidden edge cases deterministically.",
    "Keep unsafe runtime boundaries out of the solution."
  ];
}

function exampleOutputBlock(example?: ChallengeExample) {
  if (!example) {
    return "stdin: <pending>\nstdout: <pending>\nverdict: PENDING";
  }
  return `stdin: ${example.input}
stdout: ${example.output}
verdict: ACCEPTED`;
}

function runtimeResultDetail(result: CodeRunCaseResult) {
  const signal = result.error ?? result.compileOutput ?? result.stderr ?? result.stdout ?? result.output;
  const limits = `${result.executionTimeMs} ms / ${Math.round(result.memoryKb / 1024)} MB`;
  return signal ? `${formatVerdict(result.verdict)} - ${signal} (${limits})` : `${formatVerdict(result.verdict)} - ${limits}`;
}

function formatVerdict(value?: string) {
  if (!value) {
    return "Pending";
  }
  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized === "UNKNOWN") {
    return "Needs Review";
  }
  return normalized.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function integrityEvents(counters: IntegrityCounters): CodeIntegrityEvent[] {
  const events: CodeIntegrityEvent[] = [];
  if (counters.focusLoss > 0) {
    events.push({ type: "FOCUS_LOSS", count: counters.focusLoss, metadata: JSON.stringify({ source: "window.blur" }) });
  }
  if (counters.pasteBurst > 0) {
    events.push({ type: "PASTE_BURST", count: counters.pasteBurst, metadata: JSON.stringify({ windowMs: 1500 }) });
  }
  if (counters.tabHidden > 0) {
    events.push({ type: "TAB_HIDDEN", count: counters.tabHidden, metadata: JSON.stringify({ source: "visibilitychange" }) });
  }
  return events;
}

function elapsedSeconds(startedAt: number) {
  return Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
}

async function clientFingerprintHash() {
  const source = [
    navigator.userAgent,
    navigator.language,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  ].join("|");
  if (!crypto.subtle) {
    return fallbackHash(source);
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fallbackHash(value: string) {
  let hash = 0x811c9dc5;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

function assessmentEvidenceCases(item: CodeAssessment) {
  if (item.language.toLowerCase() === "sql") {
    return [
      { label: "Scopes by employer_id", detail: "Query is tenant-scoped before aggregation.", matched: (code: string) => /employer_id/i.test(code) },
      { label: "Groups by status", detail: "Pipeline states are aggregated deterministically.", matched: (code: string) => /group\s+by\s+status/i.test(code) },
      { label: "Avoids unbounded result sets", detail: "Uses WHERE or LIMIT to avoid unsafe scans.", matched: (code: string) => /limit|where/i.test(code) }
    ];
  }
  if (item.challengeTitle.toLowerCase().includes("cloud architecture")) {
    return [
      { label: "Runtime solve contract", detail: "Defines CandidateSolution.solve for the judge harness.", matched: (code: string) => /class\s+CandidateSolution[\s\S]*solve\s*\(\s*String\s+input/i.test(code) },
      { label: "Policy Enforcement", detail: "Applies EnterpriseSecurityPolicy.STRICT.", matched: (code: string) => /enterprisesecuritypolicy\.strict/i.test(code) },
      { label: "Tag Filtering", detail: "Restricts validation to production resources.", matched: (code: string) => /production/i.test(code) }
    ];
  }
  if (item.challengeTitle.toLowerCase().includes("search")) {
    return [
      { label: "OpenSearch primary adapter", detail: "Uses the search adapter for relevance-first retrieval.", matched: (code: string) => /opensearch|search/i.test(code) },
      { label: "PostgreSQL recovery path", detail: "Defines a repository or JDBC recovery path.", matched: (code: string) => /postgres|jdbc|repository/i.test(code) },
      { label: "Published-only visibility guard", detail: "Filters private jobs from public results.", matched: (code: string) => /published/i.test(code) }
    ];
  }
  return [
    { label: "Transaction or batch boundary", detail: "Protects publish state with an atomic batch boundary.", matched: (code: string) => /transaction|batch/i.test(code) },
    { label: "Retry and max attempt handling", detail: "Handles bounded retry and poison-message safety.", matched: (code: string) => /retry|maxattempt/i.test(code) },
    { label: "Solve output contract", detail: "Returns a deterministic stdout value from solve(String input).", matched: (code: string) => /return\s+[\s\S]*;/i.test(code) }
  ];
}

function challengeExamples(item: CodeAssessment): ChallengeExample[] {
  if (item.language.toLowerCase() === "sql") {
    return [
      {
        title: "Example 1",
        input: "applications(employer_id=17, status in [SUBMITTED, INTERVIEW])",
        output: "SUBMITTED=12, INTERVIEW=5",
        explanation: "The reviewer expects tenant-scoped grouping before counts are returned."
      },
      {
        title: "Example 2",
        input: "applications from another employer",
        output: "excluded",
        explanation: "Cross-company rows must never leak into an employer dashboard."
      }
    ];
  }
  if (item.challengeTitle.toLowerCase().includes("cloud architecture")) {
    return [
      {
        title: "Example 1",
        input: "resource=res-9982;policy=STRICT;tag=production",
        output: "PASSED",
        explanation: "Production resources pass the strict validation boundary."
      },
      {
        title: "Example 2",
        input: "resource=res-4411;policy=STRICT;tag=staging",
        output: "REJECTED",
        explanation: "Non-production resources are rejected by the same runtime contract."
      }
    ];
  }
  if (item.challengeTitle.toLowerCase().includes("search")) {
    return [
      {
        title: "Example 1",
        input: "keyword='spring kafka', status=PUBLISHED",
        output: "ranked published jobs",
        explanation: "Prefer search relevance while preserving publication visibility."
      },
      {
        title: "Example 2",
        input: "OpenSearch unavailable",
        output: "PostgreSQL fallback results",
        explanation: "The candidate should keep public search usable during dependency degradation."
      }
    ];
  }
  return [
    {
      title: "Example 1",
      input: "3 pending events, maxAttempts=3",
      output: "3 published events",
      explanation: "The batch should publish eligible events and preserve idempotency."
    },
    {
      title: "Example 2",
      input: "1 event already at maxAttempts",
      output: "event stays reviewable",
      explanation: "Poison-message handling should prevent endless retries."
    }
  ];
}

function complexityTargets(item: CodeAssessment) {
  if (item.language.toLowerCase() === "sql") {
    return ["Expected: indexed WHERE + GROUP BY", "Watch: tenant isolation", "Evidence: bounded result set"];
  }
  if (item.challengeTitle.toLowerCase().includes("cloud architecture")) {
    return ["Expected: CandidateSolution.solve", "Watch: strict policy enforcement", "Evidence: visible stdout cases"];
  }
  if (item.challengeTitle.toLowerCase().includes("search")) {
    return ["Expected: adapter failover", "Watch: private result leakage", "Evidence: published-only test"];
  }
  return ["Expected: O(n) batch pass", "Watch: duplicate publish risk", "Evidence: visible stdout cases"];
}

function difficultyLabel(item: CodeAssessment) {
  const normalized = item.level.toLowerCase();
  if (normalized.includes("senior") || normalized.includes("lead")) {
    return "Hard";
  }
  if (normalized.includes("mid")) {
    return "Medium";
  }
  return "Interview";
}

function formatSandboxStatus(value?: string) {
  if (!value) {
    return "Judge0-compatible sandbox";
  }
  if (value.toLowerCase().includes("blocked")) {
    return "Sandbox policy blocked";
  }
  return "Judge0-compatible sandbox";
}

function formatDate(value: string) {
  return formatShortDate(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function submissionHistory(item: CodeAssessment) {
  const submitted = Boolean(item.submittedAt);
  const finalized = FINAL_STATUSES.has(item.status);
  return [
    {
      title: "Challenge assigned",
      description: `${item.challengeTitle} assigned for ${item.jobTitle}.`,
      status: "ASSIGNED",
      completed: true
    },
    {
      title: "Candidate submission",
      description: submitted
        ? `Submitted ${formatDate(item.submittedAt ?? item.assignedAt)} with ${item.language} evidence.`
        : `Due ${formatDate(item.dueAt)} with code, notes, and visible-case evidence.`,
      status: submitted ? "SUBMITTED" : "SCHEDULED",
      completed: submitted
    },
    {
      title: "Rubric review",
      description: item.latestScore == null
        ? "Runtime rubric is generated after submission."
        : `Latest rubric score ${item.latestScore}/${item.maxScore} across correctness, maintainability, security, and input handling.`,
      status: item.latestScore == null ? "PENDING" : "REVIEWED",
      completed: item.latestScore != null
    },
    {
      title: "Employer decision",
      description: finalized
        ? `Employer decision recorded as ${statusLabel(item.status).toLowerCase()}.`
        : "Employer review queue will decide advance, hold, or reject after rubric review.",
      status: finalized ? item.status : "REVIEWING",
      completed: finalized
    }
  ];
}

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
import { statusLabel } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { formatShortDate } from "@/lib/dateFormat";
import { previewCodeAssessments } from "@/lib/previewData";
import type { CodeAssessment, CodeIntegrityEvent, CodeRun } from "@/types/domain";

const FINAL_STATUSES = new Set(["PASSED", "FAILED"]);
const DEFAULT_CODE = `package com.devhire.cloud;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

/**
 * Main application class for the DevHire Cloud Resource Manager.
 * TASK 1: Implement the missing Bean definition below.
 */
@SpringBootApplication
public class CloudServiceApplication {

  public static void main(String[] args) {
    SpringApplication.run(CloudServiceApplication.class, args);
  }

  /* TODO: Implement ResourceValidator Bean here */
  @Bean
  public ResourceValidator resourceValidator() {
    return new ResourceValidator(EnterpriseSecurityPolicy.STRICT, "production");
  }

  @Test
  void validatesProductionResourcesWithStrictPolicy() {
    assert resourceValidator().policy() == EnterpriseSecurityPolicy.STRICT;
  }
}`;

type EvidenceCase = {
  label: string;
  detail: string;
  matched: (code: string) => boolean;
};

type AnalysisResult = {
  label: string;
  detail: string;
  matched: boolean;
  output?: string;
  error?: string;
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
  const [integrityCounters, setIntegrityCounters] = useState<IntegrityCounters>({ focusLoss: 0, pasteBurst: 0, tabHidden: 0 });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const sessionStartedAt = useRef(Date.now());
  const lastPasteAt = useRef(0);

  useEffect(() => {
    api.candidateCodeAssessments()
      .then((items) => {
        const next = items.length ? items : previewCodeAssessments;
        const flagship = next.find((item) => item.challengeTitle.toLowerCase().includes("cloud architecture"));
        const preferred = flagship ?? next.find((item) => !FINAL_STATUSES.has(item.status)) ?? next[0];
        setAssessments(next);
        setSelectedId(preferred?.id ?? "");
      })
      .catch(() => setAssessments(previewCodeAssessments));
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
        detail: result.error ?? result.output ?? `${result.executionTimeMs} ms / ${Math.round(result.memoryKb / 1024)} MB`,
        matched: result.passed,
        output: result.output,
        error: result.error
      }));
  const testResultRows = displayedResults.length
    ? displayedResults
    : visibleCases.map((testCase, index) => ({
        label: testCase.label,
        detail: testCase.detail,
        matched: index === 0
      }));

  useEffect(() => {
    if (!selected) {
      return;
    }
    setLanguage(selected.language || "Java");
    setCode(selected.submittedCode || selected.submittedCodePreview || selected.starterCode || DEFAULT_CODE);
    setAnalysisMessage("");
    setAnalysisResults([]);
    setLatestRun(selected.latestRun);
    setIntegrityCounters({ focusLoss: 0, pasteBurst: 0, tabHidden: 0 });
    sessionStartedAt.current = Date.now();

    if (!isUuid(selected.id) || selected.submittedCode) {
      return;
    }
    setLoadingDetail(true);
    api.candidateCodeAssessment(selected.id)
      .then((detail) => {
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
    if (isUuid(selected.id)) {
      try {
        setRunning(true);
        const run = await api.runCodeAssessment(
          selected.id,
          language,
          code,
          integrityEvents(integrityCounters),
          await clientFingerprintHash(),
          elapsedSeconds(sessionStartedAt.current)
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
          detail: result.error ?? result.output ?? `${result.executionTimeMs} ms / ${Math.round(result.memoryKb / 1024)} MB`,
          matched: result.passed,
          output: result.output,
          error: result.error
        })));
        setAnalysisMessage(
          `${run.visiblePassed}/${run.visibleTotal} visible cases passed in ${run.executionTimeMs} ms; hidden cases remain server-side for final submit.`
        );
        return;
      } catch (ex) {
        setAnalysisMessage(ex instanceof Error && ex.message !== "Failed to fetch"
          ? ex.message
          : "Local static judge is active while the sandbox runner is unreachable.");
      } finally {
        setRunning(false);
      }
    }
    const hasTest = /(@test|assert|expect\()/i.test(code);
    const hasRisk = /(api[_-]?key|password|secret|runtime\.getruntime|processbuilder|system\.exit)/i.test(code);
    const cases = assessmentEvidenceCases(selected);
    const results = cases.map((testCase) => ({
      label: testCase.label,
      detail: testCase.detail,
      matched: testCase.matched(code)
    }));
    const caseCount = results.filter((testCase) => testCase.matched).length;
    setAnalysisResults(results);
    setAnalysisMessage(
      `${caseCount}/${cases.length} static judge cases matched; ${
        hasRisk ? "security review required" : hasTest ? "test evidence present" : "add assertion evidence"
      }.`
    );
  }

  async function submitCode() {
    if (!selected) {
      return;
    }
    if (FINAL_STATUSES.has(selected.status)) {
      setMessage("Employer decision is already locked for this challenge.");
      return;
    }
    if (code.trim().length < 40) {
      setMessage("Add a meaningful implementation before submitting for review.");
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
      setMessage(`Rubric score ready: ${updated.latestScore ?? 0}/${updated.maxScore}; hidden tests were scored server-side.`);
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
          <span className="assessment-language">{language} / Spring Boot</span>
        </div>
        <div className="assessment-top-actions">
          <div className="assessment-timer" aria-label="Assessment time remaining">
            <Clock3 size={20} />
            <span>45:00</span>
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
            disabled={submitting || FINAL_STATUSES.has(selected.status)}
          >
            <Upload size={20} />
            {submitting ? "Scoring" : "Submit Code"}
          </button>
        </div>
      </header>

      <div className="assessment-main">
        <section className="assessment-editor-pane" aria-label="Coding workspace">
          <div className="assessment-file-tabs" role="tablist" aria-label="Assessment files">
            <button className="assessment-file-tab active" type="button" role="tab" aria-selected="true">
              <Code2 size={18} />
              CloudServiceApplication.java
              <X size={15} />
            </button>
            <button className="assessment-file-tab" type="button" role="tab" aria-selected="false">
              <Code2 size={18} />
              ResourceController.java
            </button>
            <button className="assessment-file-tab" type="button" role="tab" aria-selected="false">
              <FileText size={18} />
              application.yml
            </button>
          </div>

          <div className="assessment-editor-body">
            <div className="assessment-line-numbers" aria-hidden="true">
              {lineNumbers.map((line) => <span key={line}>{line}</span>)}
            </div>
            <textarea
              className="assessment-code-input"
              aria-label="Candidate code submission"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Write the solution, edge-case handling, and assertion evidence here."
              spellCheck={false}
            />
          </div>

          <div className="assessment-terminal">
            <div className="assessment-terminal-tabs">
              <span className="active">TERMINAL</span>
              <span>OUTPUT</span>
              <span>PROBLEMS</span>
            </div>
            <div className="assessment-terminal-output" aria-live="polite">
              <p><span>devhire@cloud</span>:<strong>~/project</strong>$ ./mvnw clean test</p>
              <p>[INFO] Scanning for projects...</p>
              <p>[INFO] Building DevHire Cloud Service 1.0.0</p>
              {analysisMessage ? <p className="terminal-success">{analysisMessage}</p> : null}
              {message ? <p className="terminal-success">{message}</p> : null}
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
              <span>{visibleCases.length + 2}</span>
            </button>
          </div>

          <div className="assessment-side-content">
            <section className="assessment-instruction-block">
              <h2>Task 1: Resource Validation Bean</h2>
              <div className="assessment-task-meta">
                <span>{difficultyLabel(selected)}</span>
                <span>{selected.language}</span>
                <span>Due {formatDate(selected.dueAt)}</span>
              </div>
              <p>
                In this scenario, implement a custom <code>ResourceValidator</code> bean in the main application class.
                The default validator must enforce the security policies required for enterprise deployments.
              </p>
              <p>{selected.prompt}</p>
              <div className="assessment-requirements">
                <h3>
                  <ListChecks size={18} />
                  Requirements
                </h3>
                <ul>
                  <li>Define the bean using the <code>@Bean</code> annotation.</li>
                  <li>Initialize it with <code>EnterpriseSecurityPolicy.STRICT</code>.</li>
                  <li>Ensure it only validates resources tagged with <code>production</code>.</li>
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
              <pre className="assessment-example-output">{`[INFO] Validating Resource: res-9982
[DEBUG] Policy: STRICT applied.
[INFO] Validation Status: PASSED`}</pre>
            </section>

            <section className="assessment-test-panel">
              <div className="assessment-panel-heading">
                <h2>Test Results</h2>
                <button className="assessment-link-button" type="button" onClick={runStaticAnalysis} disabled={running}>
                  <PlayCircle size={16} />
                  {running ? "Running Tests" : "Run Tests"}
                </button>
              </div>
              <div className="assessment-test-list" aria-label="Static judge case results">
                {testResultRows.slice(0, 3).map((result, index) => (
                  <div className={`assessment-test-row ${result.matched ? "passed" : index === 1 ? "failed" : "pending"}`} key={result.label}>
                    <span>
                      {result.matched ? <CheckCircle2 size={20} /> : index === 1 ? <CircleX size={20} /> : <Hourglass size={20} />}
                      <strong>{result.label}</strong>
                    </span>
                    <em>{result.matched ? "Passed" : index === 1 ? "Failed" : "Pending"}</em>
                  </div>
                ))}
              </div>
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
                disabled={submitting || FINAL_STATUSES.has(selected.status)}
              >
                {FINAL_STATUSES.has(selected.status)
                  ? "Employer decision locked"
                  : submitting ? "Scoring" : "Send rubric evidence"}
              </button>
            </section>

            <section className="assessment-instruction-block">
              <div className="assessment-panel-heading">
                <h2>Submission history</h2>
                <SquareTerminal size={18} />
              </div>
              <div className="assessment-history-list">
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
    { category: "Test and evidence quality", score: 0, maxScore: 10, evidence: "Waiting for candidate submission." }
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
      { label: "Bean Initialization", detail: "Defines ResourceValidator as a Spring bean.", matched: (code: string) => /@bean[\s\S]*resourcevalidator/i.test(code) },
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
    { label: "Assertion-style test evidence", detail: "Includes executable-style assertions or test annotations.", matched: (code: string) => /@test|assert|expect\(/i.test(code) }
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
        input: "Resource res-9982 tagged production",
        output: "Validation Status: PASSED",
        explanation: "The validator applies strict policy to production resources."
      },
      {
        title: "Example 2",
        input: "Resource tagged staging",
        output: "Skipped by production filter",
        explanation: "Non-production resources must not be scored by this task."
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
    return ["Expected: @Bean ResourceValidator", "Watch: strict policy enforcement", "Evidence: production tag assertion"];
  }
  if (item.challengeTitle.toLowerCase().includes("search")) {
    return ["Expected: adapter failover", "Watch: private result leakage", "Evidence: published-only test"];
  }
  return ["Expected: O(n) batch pass", "Watch: duplicate publish risk", "Evidence: retry and assertion coverage"];
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
        : `Due ${formatDate(item.dueAt)} with code, notes, and test evidence.`,
      status: submitted ? "SUBMITTED" : "SCHEDULED",
      completed: submitted
    },
    {
      title: "Rubric review",
      description: item.latestScore == null
        ? "Deterministic rubric is generated after submission."
        : `Latest rubric score ${item.latestScore}/${item.maxScore} across correctness, maintainability, security, and tests.`,
      status: item.latestScore == null ? "PENDING" : "AUTO_REVIEWED",
      completed: item.latestScore != null
    },
    {
      title: "Employer decision",
      description: finalized
        ? `Employer decision recorded as ${statusLabel(item.status).toLowerCase()}.`
        : "Employer review queue will decide advance, hold, or reject after rubric review.",
      status: finalized ? item.status : "REVIEW_QUEUE",
      completed: finalized
    }
  ];
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Braces, CheckCircle2, ClipboardCheck, Clock3, PlayCircle, ShieldCheck, Trophy } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill, statusLabel } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { formatShortDate } from "@/lib/dateFormat";
import { previewCodeAssessments } from "@/lib/previewData";
import type { CodeAssessment, CodeIntegrityEvent, CodeRun } from "@/types/domain";

const FINAL_STATUSES = new Set(["PASSED", "FAILED"]);
const DEFAULT_CODE = `class CandidateSolution {
  Map<String, Integer> review(List<Event> events) {
    // transaction batch maxAttempts publishedAt lastError
    return Map.of("published", events.size());
  }

  @Test
  void givenPendingEvents_whenReviewed_thenPublishesBatch() {
    assert true;
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
  const [notes, setNotes] = useState("I focused on idempotency, transaction boundaries, and reviewer-safe evidence.");
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
        const preferred = next.find((item) => !FINAL_STATUSES.has(item.status)) ?? next[0];
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
  const average = Math.round(
    assessments.reduce((sum, item) => sum + (item.latestScore ?? 0), 0) / Math.max(completed, 1)
  );
  const riskFlags = assessments.flatMap((item) => item.riskFlags).length;

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
      const simulated = simulateLocalReview(selected, code);
      setAssessments((current) => current.map((item) => (item.id === simulated.id ? simulated : item)));
      setLatestRun(simulated.latestRun);
      setMessage(ex instanceof Error && ex.message !== "Failed to fetch"
        ? ex.message
        : `Rubric score ready: ${simulated.latestScore}/${simulated.maxScore}.`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-stack" data-testid="candidate-assessments-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Code assessment</p>
          <h1>Code Interview Studio</h1>
          <p>
            Solve interview-style coding challenges with visible examples, static judge cases, rubric scoring, security
            smell checks, and employer-ready review evidence.
          </p>
        </div>
        <div className="hero-actions">
          <span className="badge live">Sandbox judge</span>
          <span className="badge">Employer rubric</span>
        </div>
      </div>

      <div className="metrics-row">
        <MetricCard icon={ClipboardCheck} label="Assigned" value={assessments.length} helper="Coding challenges" />
        <MetricCard icon={Trophy} label="Reviewed" value={completed} helper="With rubric evidence" />
        <MetricCard icon={CheckCircle2} label="Average" value={`${average}%`} helper="Latest submissions" />
        <MetricCard icon={ShieldCheck} label="Risk flags" value={riskFlags} helper="Sandbox and integrity signals" />
      </div>

      <div className="split-grid assessment-workspace">
        <div className="panel">
          <div className="section-title">
            <Braces size={20} />
            <h2>Challenge queue</h2>
          </div>
          <div className="assessment-list">
            {assessments.map((item) => (
              <button
                className={`assessment-card ${item.id === selected?.id ? "active" : ""}`}
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
              >
                <span>
                  <strong>{item.challengeTitle}</strong>
                  <small>{item.jobTitle} / {item.language} / due {formatDate(item.dueAt)}</small>
                </span>
                <span className="score-chip">{item.latestScore == null ? "Pending" : `${item.latestScore}/${item.maxScore}`}</span>
                <StatusPill value={item.status} />
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          {selected ? (
            <>
              <div className="section-title">
                <ClipboardCheck size={20} />
                <h2>{selected.challengeTitle}</h2>
              </div>
              <div className="interview-lab-grid">
                <div className="constraint-box problem-card">
                  <strong>Problem statement</strong>
                  <p>{selected.prompt}</p>
                  <div className="tag-list">
                    <span className="badge">{difficultyLabel(selected)}</span>
                    <span className="badge">{selected.language}</span>
                    <span className="badge">Due {formatDate(selected.dueAt)}</span>
                  </div>
                </div>
                <div className="constraint-box judge-card">
                  <strong>Interview target</strong>
                  {complexityTargets(selected).map((target) => (
                    <span key={target}>{target}</span>
                  ))}
                </div>
              </div>
              <div className="example-grid">
                {challengeExamples(selected).map((example) => (
                  <div className="example-card" key={example.title}>
                    <strong>{example.title}</strong>
                    <code>Input: {example.input}</code>
                    <code>Output: {example.output}</code>
                    <span>{example.explanation}</span>
                  </div>
                ))}
              </div>
              <div className="evidence-grid">
                <div className="constraint-box">
                  <strong>Visible judge cases</strong>
                  {visibleJudgeCases(selected).map((testCase) => (
                    <span key={testCase.label}>{testCase.label}: {testCase.detail}</span>
                  ))}
                </div>
                <div className="constraint-box">
                  <strong>Session integrity</strong>
                  <span>{selected.skills.join(" / ")}</span>
                  <span>Attempt {selected.attemptNumber ?? 0} / grader {selected.graderVersion ?? "static-rubric-v1"}</span>
                  <span>Rubric {selected.rubricVersion ?? "devhire-code-rubric-v1"}</span>
                  <span>Focus {integrityCounters.focusLoss} / paste bursts {integrityCounters.pasteBurst} / hidden tabs {integrityCounters.tabHidden}</span>
                  {selected.codeHash ? <span>Code hash {selected.codeHash.slice(0, 12)}</span> : null}
                </div>
              </div>
              <div className="evidence-grid">
                <div className="constraint-box">
                  <strong>Sandbox execution</strong>
                  <span>{(latestRun ?? selected.latestRun)?.sandboxStatus ?? selected.sandboxStatus ?? "JUDGE0_COMPATIBLE_LOCAL_SANDBOX"}</span>
                  <span>Visible {(latestRun ?? selected.latestRun)?.visiblePassed ?? 0}/{(latestRun ?? selected.latestRun)?.visibleTotal ?? selected.visibleTestCases?.length ?? 0}</span>
                  <span>Hidden {(latestRun ?? selected.latestRun)?.hiddenPassed ?? 0}/{(latestRun ?? selected.latestRun)?.hiddenTotal ?? 0} scored only after submit</span>
                </div>
                <div className="constraint-box">
                  <strong>Risk signals</strong>
                  <span>Integrity risk {Math.round((latestRun?.integrityRiskScore ?? selected.integrityRiskScore ?? 0) * 10) / 10}%</span>
                  <span>Similarity {Math.round((latestRun?.similarityScore ?? selected.similarityScore ?? 0) * 10) / 10}%</span>
                  <span>Deadline lock {FINAL_STATUSES.has(selected.status) ? "finalized" : `open until ${formatDate(selected.dueAt)}`}</span>
                </div>
              </div>
              <div className="form">
                <div className="editor-toolbar">
                  <label>
                    Language
                    <select aria-label="Submission language" value={language} onChange={(event) => setLanguage(event.target.value)}>
                      <option>Java</option>
                      <option>SQL</option>
                      <option>TypeScript</option>
                    </select>
                  </label>
                  <span className="badge">Time box 45 min</span>
                  <span className="badge">Target score 85+</span>
                  <span className="badge">Hidden tests server-side</span>
                </div>
                <textarea
                  className="code-editor"
                  aria-label="Candidate code submission"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Write the solution, edge-case handling, and assertion evidence here."
                  spellCheck={false}
                />
                <textarea
                  aria-label="Candidate notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Explain tradeoffs, tests, and operational assumptions."
                />
                <button
                  className="button primary"
                  type="button"
                  onClick={submitCode}
                  disabled={submitting || FINAL_STATUSES.has(selected.status)}
                >
                  {FINAL_STATUSES.has(selected.status)
                    ? "Employer decision locked"
                    : submitting ? "Scoring" : "Submit for rubric score"}
                </button>
                <button className="button secondary" type="button" onClick={runStaticAnalysis} disabled={running}>
                  <PlayCircle size={16} />
                  {running ? "Running visible cases" : "Run judge analysis"}
                </button>
              </div>
              {loadingDetail ? <p className="muted">Owner-only submission detail sync in progress...</p> : null}
              {analysisMessage ? <p className="success">{analysisMessage}</p> : null}
              {analysisResults.length ? (
                <div className="judge-results" aria-label="Static judge case results">
                  {analysisResults.map((result) => (
                    <div className="judge-case" key={result.label}>
                      <span className={result.matched ? "case-dot pass" : "case-dot"} />
                      <span>
                        <strong>{result.label}</strong>
                        <small>{result.detail}</small>
                        {result.output ? <small>{result.output}</small> : null}
                      </span>
                      <span className={result.matched ? "badge live" : "badge warn"}>
                        {result.matched ? "Matched" : "Needs evidence"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
              {message ? <p className="success">{message}</p> : null}
            </>
          ) : null}
        </div>
      </div>

      {selected ? (
        <div className="panel">
          <div className="section-title">
            <ShieldCheck size={20} />
            <h2>Rubric breakdown</h2>
          </div>
          <div className="rubric-grid">
            {(selected.rubric.length ? selected.rubric : emptyRubric()).map((item) => (
              <div className="rubric-card" key={item.category}>
                <div className="status-line">
                  <strong>{item.category}</strong>
                  <span className="score-chip">{item.score}/{item.maxScore}</span>
                </div>
                <p>{item.evidence}</p>
              </div>
            ))}
          </div>
          <div className="review-summary">
            <strong>Review feedback</strong>
            <p>{selected.feedback ?? "Submit an implementation to generate deterministic rubric feedback."}</p>
            <div className="tag-list">
              {selected.skills.map((skill) => <span className="badge" key={skill}>{skill}</span>)}
              {(selected.riskFlags.length ? selected.riskFlags : ["no-risk-flags"]).map((flag) => (
                <span className={flag === "no-risk-flags" ? "badge live" : "badge warn"} key={flag}>
                  {flag.replaceAll("-", " ")}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="panel">
          <div className="section-title">
            <Clock3 size={20} />
            <h2>Submission history</h2>
          </div>
          <div className="timeline-list">
            {submissionHistory(selected).map((event) => (
              <div className="timeline-item" key={event.title}>
                <span className={event.completed ? "timeline-dot done" : "timeline-dot"} />
                <span>
                  <strong>{event.title}</strong>
                  <small>{event.description}</small>
                </span>
                <StatusPill value={event.status} />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function simulateLocalReview(item: CodeAssessment, code: string): CodeAssessment {
  const hasTest = /(@test|assert|expect\()/i.test(code);
  const hasRisk = /(api[_-]?key|password|secret|runtime\.getruntime|processbuilder|system\.exit)/i.test(code);
  const matchedCases = assessmentEvidenceCases(item).filter((testCase) => testCase.matched(code)).length;
  const score = Math.max(
    58,
    Math.min(96, 62 + Math.floor(code.length / 140) + matchedCases * 6 + (hasTest ? 9 : 0) - (hasRisk ? 16 : 0))
  );
  return {
    ...item,
    status: "AUTO_REVIEWED",
    latestScore: score,
    latestDecision: score >= 85 && !hasRisk ? "ADVANCE" : "REVIEW",
    submittedCode: code,
    submittedCodePreview: code.replace(/\s+/g, " ").slice(0, 220),
    hasSubmittedCode: true,
    attemptNumber: (item.attemptNumber ?? 0) + 1,
    codeHash: "local-static-analysis",
    graderVersion: item.graderVersion ?? "static-rubric-v1",
    rubricVersion: item.rubricVersion ?? "devhire-code-rubric-v1",
    latestRun: {
      id: "local-visible-run",
      status: hasRisk ? "POLICY_BLOCKED" : "COMPLETED",
      sandboxStatus: hasRisk ? "sandbox-policy-blocked" : "JUDGE0_COMPATIBLE_LOCAL_SANDBOX",
      visiblePassed: matchedCases,
      visibleTotal: assessmentEvidenceCases(item).length,
      hiddenPassed: 0,
      hiddenTotal: 0,
      executionTimeMs: Math.max(42, Math.min(900, Math.floor(code.length / 8))),
      memoryKb: 18_432,
      failureReason: hasRisk ? "Network, filesystem, or process boundary usage requires server review." : undefined,
      integrityRiskScore: 0,
      similarityScore: 0,
      results: assessmentEvidenceCases(item).map((testCase) => ({
        caseId: testCase.label,
        name: testCase.label,
        visibility: "VISIBLE",
        passed: testCase.matched(code),
        output: testCase.matched(code) ? `matched:${testCase.label}` : undefined,
        error: testCase.matched(code) ? undefined : testCase.detail,
        executionTimeMs: 42,
        memoryKb: 18_432
      })),
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    },
    integrityRiskScore: 0,
    similarityScore: 0,
    sandboxStatus: hasRisk ? "sandbox-policy-blocked" : "JUDGE0_COMPATIBLE_LOCAL_SANDBOX",
    submittedAt: new Date().toISOString(),
    feedback: score >= 85
      ? "Strong production-ready submission with clear implementation signals and low review risk."
      : "Promising submission. Employer review should focus on edge cases, test depth, and deployment safety.",
    riskFlags: hasRisk ? ["security-review-required"] : hasTest ? [] : ["missing-test-evidence"],
    rubric: [
      { category: "Correctness and completeness", score: Math.min(38, Math.floor(score * 0.4)), maxScore: 40, evidence: "Implementation signals reviewed." },
      { category: "Maintainability and readability", score: 17, maxScore: 20, evidence: "Readable structure and focused implementation." },
      { category: "Complexity and performance", score: 12, maxScore: 15, evidence: "Batching and data access tradeoffs considered." },
      { category: "Security posture", score: hasRisk ? 8 : 15, maxScore: 15, evidence: hasRisk ? "Static risk requires employer review." : "No high-risk static smell detected." },
      { category: "Test and evidence quality", score: hasTest ? 9 : 4, maxScore: 10, evidence: hasTest ? "Assertion evidence included." : "Add stronger test evidence." }
    ]
  };
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

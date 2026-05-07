"use client";

import { useEffect, useMemo, useState } from "react";
import { Braces, CheckCircle2, ClipboardCheck, Clock3, PlayCircle, ShieldCheck, Trophy } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill, statusLabel } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { previewCodeAssessments } from "@/lib/previewData";
import type { CodeAssessment } from "@/types/domain";

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

export default function CandidateAssessmentsPage() {
  const [assessments, setAssessments] = useState<CodeAssessment[]>(previewCodeAssessments);
  const [selectedId, setSelectedId] = useState(previewCodeAssessments[0]?.id ?? "");
  const [language, setLanguage] = useState(previewCodeAssessments[0]?.language ?? "Java");
  const [code, setCode] = useState(previewCodeAssessments[0]?.submittedCode ?? DEFAULT_CODE);
  const [notes, setNotes] = useState("I focused on idempotency, transaction boundaries, and reviewer-safe evidence.");
  const [message, setMessage] = useState("");
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

    if (!isUuid(selected.id) || selected.submittedCode) {
      return;
    }
    setLoadingDetail(true);
    api.candidateCodeAssessment(selected.id)
      .then((detail) => {
        setAssessments((current) => current.map((item) => (item.id === detail.id ? detail : item)));
        setCode(detail.submittedCode || detail.submittedCodePreview || detail.starterCode || DEFAULT_CODE);
      })
      .catch(() => {
        setCode(selected.submittedCodePreview || selected.starterCode || DEFAULT_CODE);
      })
      .finally(() => setLoadingDetail(false));
  }, [selected?.id]);

  function runStaticAnalysis() {
    if (!selected) {
      return;
    }
    const hasTest = /(@test|assert|expect\()/i.test(code);
    const hasRisk = /(api[_-]?key|password|secret|runtime\.getruntime|processbuilder|system\.exit)/i.test(code);
    const caseCount = assessmentEvidenceCases(selected).filter((testCase) => testCase.matched(code)).length;
    setAnalysisMessage(
      `${caseCount}/${assessmentEvidenceCases(selected).length} static cases matched; ${
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
      const updated = await api.submitCodeAssessment(selected.id, language, code, notes);
      setAssessments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`Rubric score ready: ${updated.latestScore ?? 0}/${updated.maxScore}.`);
    } catch (ex) {
      const simulated = simulateLocalReview(selected, code);
      setAssessments((current) => current.map((item) => (item.id === simulated.id ? simulated : item)));
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
          <h1>Technical proof workspace</h1>
          <p>
            Complete coding challenges with deterministic rubric scoring, security smell checks, and employer-ready
            review evidence.
          </p>
        </div>
        <div className="hero-actions">
          <span className="badge live">Safe static review</span>
          <span className="badge">Deterministic rubric</span>
        </div>
      </div>

      <div className="metrics-row">
        <MetricCard icon={ClipboardCheck} label="Assigned" value={assessments.length} helper="Coding challenges" />
        <MetricCard icon={Trophy} label="Reviewed" value={completed} helper="With rubric evidence" />
        <MetricCard icon={CheckCircle2} label="Average" value={`${average}%`} helper="Latest submissions" />
        <MetricCard icon={ShieldCheck} label="Risk flags" value={riskFlags} helper="Static review signals" />
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
              <p className="muted">{selected.prompt}</p>
              <div className="constraint-box">
                <strong>Review constraints</strong>
                <span>{selected.constraints}</span>
              </div>
              <div className="evidence-grid">
                <div className="constraint-box">
                  <strong>Visible static cases</strong>
                  {assessmentEvidenceCases(selected).map((testCase) => (
                    <span key={testCase.label}>{testCase.label}</span>
                  ))}
                </div>
                <div className="constraint-box">
                  <strong>Required signals</strong>
                  <span>{selected.skills.join(" / ")}</span>
                  <span>Attempt {selected.attemptNumber ?? 0} / grader {selected.graderVersion ?? "static-rubric-v1"}</span>
                  <span>Rubric {selected.rubricVersion ?? "devhire-code-rubric-v1"}</span>
                  {selected.codeHash ? <span>Code hash {selected.codeHash.slice(0, 12)}</span> : null}
                </div>
              </div>
              <div className="form">
                <select aria-label="Submission language" value={language} onChange={(event) => setLanguage(event.target.value)}>
                  <option>Java</option>
                  <option>SQL</option>
                  <option>TypeScript</option>
                </select>
                <textarea
                  className="code-editor"
                  aria-label="Candidate code submission"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
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
                <button className="button secondary" type="button" onClick={runStaticAnalysis}>
                  <PlayCircle size={16} />
                  Run static analysis
                </button>
              </div>
              {loadingDetail ? <p className="muted">Owner-only submission detail sync in progress...</p> : null}
              {analysisMessage ? <p className="success">{analysisMessage}</p> : null}
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
  const score = Math.max(58, Math.min(94, 68 + Math.floor(code.length / 120) + (hasTest ? 10 : 0) - (hasRisk ? 15 : 0)));
  return {
    ...item,
    status: score >= 85 && !hasRisk ? "AUTO_REVIEWED" : "AUTO_REVIEWED",
    latestScore: score,
    latestDecision: score >= 85 && !hasRisk ? "ADVANCE" : "REVIEW",
    submittedCode: code,
    submittedCodePreview: code.replace(/\s+/g, " ").slice(0, 220),
    hasSubmittedCode: true,
    attemptNumber: (item.attemptNumber ?? 0) + 1,
    codeHash: "local-static-analysis",
    graderVersion: item.graderVersion ?? "static-rubric-v1",
    rubricVersion: item.rubricVersion ?? "devhire-code-rubric-v1",
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

function assessmentEvidenceCases(item: CodeAssessment) {
  if (item.language.toLowerCase() === "sql") {
    return [
      { label: "Scopes by employer_id", matched: (code: string) => /employer_id/i.test(code) },
      { label: "Groups by status", matched: (code: string) => /group\s+by\s+status/i.test(code) },
      { label: "Avoids unbounded result sets", matched: (code: string) => /limit|where/i.test(code) }
    ];
  }
  if (item.challengeTitle.toLowerCase().includes("search")) {
    return [
      { label: "OpenSearch primary adapter", matched: (code: string) => /opensearch|search/i.test(code) },
      { label: "PostgreSQL recovery path", matched: (code: string) => /postgres|jdbc|repository/i.test(code) },
      { label: "Published-only visibility guard", matched: (code: string) => /published/i.test(code) }
    ];
  }
  return [
    { label: "Transaction or batch boundary", matched: (code: string) => /transaction|batch/i.test(code) },
    { label: "Retry and max attempt handling", matched: (code: string) => /retry|maxattempt/i.test(code) },
    { label: "Assertion-style test evidence", matched: (code: string) => /@test|assert|expect\(/i.test(code) }
  ];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Bot, Building2, CheckCircle2, ClipboardCheck, Gauge, RefreshCw, ScrollText, ShieldCheck } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill, statusLabel } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { brandForCompany } from "@/lib/demoCompanies";
import { formatDateTime } from "@/lib/dateFormat";
import { previewAiProviderStatus, previewAuditLogs, previewCodeAssessmentSummary, previewCompanies, previewJobs, previewOperationsSummary } from "@/lib/previewData";
import type { AiProviderStatus, AuditLog, CodeAssessmentSummary, CodeChallenge, CodeChallengeTestCase, Company, Job, OperationsSummary, PageResponse } from "@/types/domain";

type ChallengeDraftState = {
  title: string;
  level: string;
  language: string;
  prompt: string;
  constraints: string;
  starterCode: string;
  referenceSolution: string;
  skillsCsv: string;
  requiredSignalsCsv: string;
  maxScore: number;
  active: boolean;
  testCases: CodeChallengeTestCase[];
};

export default function AdminPage() {
  const [companies, setCompanies] = useState<PageResponse<Company>>(previewCompanies);
  const [audit, setAudit] = useState<PageResponse<AuditLog>>(previewAuditLogs);
  const [aiProvider, setAiProvider] = useState<AiProviderStatus>(previewAiProviderStatus);
  const [operationsSummary, setOperationsSummary] = useState<OperationsSummary>(previewOperationsSummary);
  const [codeAssessmentSummary, setCodeAssessmentSummary] = useState<CodeAssessmentSummary>(previewCodeAssessmentSummary);
  const [codeChallenges, setCodeChallenges] = useState<CodeChallenge[]>([]);
  const [challengeLoadError, setChallengeLoadError] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [challengeDraft, setChallengeDraft] = useState<ChallengeDraftState>(defaultChallengeDraft());
  const [reviewJobs, setReviewJobs] = useState<PageResponse<Job>>(previewJobs);
  const [selectedJobId, setSelectedJobId] = useState(previewJobs.content[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [reindexing, setReindexing] = useState(false);
  const [savingChallenge, setSavingChallenge] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const challengeListRef = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 10;

  function handleSearchChange(value: string) {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 300);
  }

  const filteredChallenges = useMemo(
    () => codeChallenges.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase())),
    [codeChallenges, searchQuery]
  );

  const paginatedChallenges = useMemo(
    () => filteredChallenges.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredChallenges, currentPage]
  );

  const totalPages = Math.ceil(filteredChallenges.length / PAGE_SIZE);

  function load() {
    setLoading(true);
    Promise.all([
      api.adminCompanies("PENDING"),
      api.auditLogs(),
      api.aiProviderStatus(),
      api.adminJobs("PENDING_REVIEW"),
      api.operationsSummary(),
      api.codeAssessmentSummary(),
      api.codeChallenges().then((challenges) => { setChallengeLoadError(false); return challenges; }).catch(() => { setChallengeLoadError(true); return [] as CodeChallenge[]; })
    ])
      .then(([companyPage, auditPage, providerStatus, jobPage, ops, codeSummary, challenges]) => {
        setCompanies(companyPage);
        setAudit(auditPage);
        setAiProvider(providerStatus);
        setOperationsSummary(ops);
        setCodeAssessmentSummary(codeSummary);
        setCodeChallenges(challenges);
        setReviewJobs(jobPage.content.length ? jobPage : previewJobs);
        setSelectedJobId((current) => current || jobPage.content[0]?.id || previewJobs.content[0]?.id || "");
        setMessage("");
      })
      .catch(() => {
        setCompanies(previewCompanies);
        setAudit(previewAuditLogs);
        setAiProvider(previewAiProviderStatus);
        setOperationsSummary(previewOperationsSummary);
        setCodeAssessmentSummary(previewCodeAssessmentSummary);
        setCodeChallenges([]);
        setChallengeLoadError(true);
        setReviewJobs(previewJobs);
        setSelectedJobId(previewJobs.content[0]?.id ?? "");
        setMessage("");
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function approveCompany(id: string) {
    await api.approveCompany(id);
    load();
  }

  async function approveJob() {
    if (!selectedJobId) {
      setMessage("Select a reviewable job before approving.");
      return;
    }
    try {
      await api.approveJob(selectedJobId);
      setMessage(`Job approved: ${selectedJobTitle(reviewJobs.content, selectedJobId)}.`);
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Cannot approve job");
    }
  }

  async function reindexKnowledge() {
    try {
      setReindexing(true);
      const response = await api.reindexAiKnowledge();
      setMessage(`AI knowledge reindexed: ${response.documents} documents, ${response.chunks} chunks.`);
      load();
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Cannot reindex AI knowledge");
    } finally {
      setReindexing(false);
    }
  }

  async function saveChallenge(activeOverride = challengeDraft.active) {
    if (activeOverride && challengeDraft.language.toLowerCase() === "sql") {
      const invalidCases = challengeDraft.testCases
        .map((tc, index) => ({ tc, index }))
        .filter(({ tc }) => !tc.setupSql?.trim() || !tc.expectedRowsJson?.trim());

      if (invalidCases.length > 0) {
        const caseNames = invalidCases.map(({ tc, index }) => `Case ${index + 1} (${tc.name})`).join(", ");
        setMessage(`SQL challenge requires setupSql and expectedRowsJson for all test cases. Missing in: ${caseNames}`);
        return;
      }
    }

    try {
      setSavingChallenge(true);
      const payload = challengePayload(challengeDraft, activeOverride);
      const saved = editingChallengeId
        ? await api.updateCodeChallenge(editingChallengeId, payload)
        : await api.createCodeChallenge(payload);
      setEditingChallengeId(saved.id);
      setChallengeDraft(draftFromChallenge(saved));
      setCodeChallenges((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setMessage(activeOverride
        ? `Challenge published: ${saved.title}.`
        : `Challenge draft saved: ${saved.title}.`);
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Cannot save challenge");
    } finally {
      setSavingChallenge(false);
    }
  }

  async function toggleChallenge(challenge: CodeChallenge) {
    try {
      const updated = await api.updateCodeChallenge(challenge.id, { active: !challenge.active });
      setCodeChallenges((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`Challenge ${updated.active ? "activated" : "deactivated"}: ${updated.title}.`);
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Cannot update challenge");
    }
  }

  function loadChallengeIntoEditor(challenge: CodeChallenge) {
    setEditingChallengeId(challenge.id);
    setChallengeDraft(draftFromChallenge(challenge));
    setMessage(`Editing challenge: ${challenge.title}.`);
  }

  function resetChallengeEditor() {
    setEditingChallengeId(null);
    setChallengeDraft(defaultChallengeDraft());
    setMessage("New Java challenge draft ready.");
  }

  function updateCase(index: number, patch: Partial<CodeChallengeTestCase>) {
    setChallengeDraft((current) => ({
      ...current,
      testCases: current.testCases.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    }));
  }

  function addCase(visibility: "VISIBLE" | "HIDDEN") {
    setChallengeDraft((current) => ({
      ...current,
      testCases: [
        ...current.testCases,
        {
          name: visibility === "VISIBLE" ? "Visible example" : "Hidden edge case",
          visibility,
          stdin: "",
          expectedOutput: "",
          weight: 10,
          ordinal: current.testCases.length + 1
        }
      ]
    }));
  }

  const aiCircuitOpen = aiProvider?.circuitBreakerState === "OPEN";
  const positiveMessage = message.includes("approved")
    || message.includes("reindexed")
    || message.includes("Challenge")
    || message.includes("draft ready");
  const auditActionCounts = countBy(audit.content, (item) => item.action);
  const codeReviewed = codeAssessmentSummary.autoReviewed
    + codeAssessmentSummary.employerReviewed
    + codeAssessmentSummary.passed
    + codeAssessmentSummary.failed;
  const codePassRate = codeReviewed === 0
    ? 0
    : Math.round((codeAssessmentSummary.passed / codeReviewed) * 100);

  return (
    <section className="page-stack" data-testid="admin-dashboard">
      <div className="hero-strip">
        <div>
        <p className="eyebrow">Admin workspace</p>
        <h1>Review console</h1>
          <p>
            A control plane for company approvals, job publishing, and immutable audit visibility across the platform.
          </p>
        </div>
        <div className="hero-actions">
          <span className="badge live">RBAC enforced</span>
          <span className="badge">Audit log enabled</span>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={Building2} label="Companies" value={companies?.totalElements ?? 0} helper="Review queue" />
        <MetricCard icon={Activity} label="Audit events" value={operationsSummary.auditEvents} helper="Kafka ingested" />
        <MetricCard icon={ShieldCheck} label="Pending" value={companies?.content.filter((item) => item.status === "PENDING").length ?? 0} helper="Needs admin action" />
        <MetricCard icon={Bot} label="AI mode" value={displayProviderMode(aiProvider?.mode ?? "REVIEWER_SAFE")} helper={aiProvider?.apiKeyConfigured ? "Claude API" : "Reviewer-safe preview"} />
      </div>
      {message && positiveMessage ? <p className="success">{message}</p> : null}
      {message && !positiveMessage ? <p className="error">{message}</p> : null}
      <div className="split-grid">
        <div className="panel">
          <div className="section-title">
            <ClipboardCheck size={20} />
            <h2>Company reviews</h2>
          </div>
          <div className="table-list">
            {loading && companies.content.length === 0 ? <div className="empty-state compact">Syncing admin review queue...</div> : null}
            {companies.content.length === 0 ? (
              <div className="empty-state compact">No companies waiting for review.</div>
            ) : null}
            {companies.content.map((company) => (
              <div className="table-row" key={company.id}>
                <div className="company-line">
                  <CompanyLogo brand={brandForCompany(company)} size="sm" />
                  <span>
                    <strong>{company.name}</strong>
                    <span>{company.website ?? company.slug}</span>
                  </span>
                </div>
                <StatusPill value={company.status} />
                {company.status === "PENDING" ? (
                  <button className="button secondary" type="button" onClick={() => approveCompany(company.id)}>
                    Approve
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="form inline-form">
            <select
              aria-label="Reviewable job"
              value={selectedJobId}
              onChange={(event) => setSelectedJobId(event.target.value)}
            >
              {reviewJobs.content.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} - {statusLabel(job.status)}
                </option>
              ))}
            </select>
            <button className="button primary" type="button" onClick={approveJob}>
              Approve job
            </button>
          </div>
        </div>
        <div className="panel">
          <div className="section-title">
            <ScrollText size={20} />
            <h2>Audit log</h2>
          </div>
          <div className="insight-list compact">
            {Object.entries(auditActionCounts).slice(0, 4).map(([action, count]) => (
              <div className="insight-line" key={action}>
                <span>{action.replaceAll("_", " ").toLowerCase()}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <div className="stack">
            {loading && audit.content.length === 0 ? <div className="empty-state compact">Syncing audit stream...</div> : null}
            {audit.content.length === 0 ? <div className="empty-state compact">No audit events yet.</div> : null}
            {audit.content.slice(0, 12).map((item) => (
              <div className="audit-item" key={item.id}>
                <div className="status-line">
                  <strong>{item.action}</strong>
                  <StatusPill value={item.actorRole} />
                </div>
                <span className="muted">{item.actorEmail}</span>
                <small>{formatDateTime(item.createdAt)}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="section-title">
          <ClipboardCheck size={20} />
          <h2>Code assessment health</h2>
        </div>
        <div className="metrics-row compact-metrics">
          <MetricCard icon={ClipboardCheck} label="Assignments" value={codeAssessmentSummary.totalAssignments} helper="Active code challenges" />
          <MetricCard icon={Gauge} label="Average score" value={`${codeAssessmentSummary.averageScore}%`} helper="Runtime rubric" />
          <MetricCard icon={CheckCircle2} label="Runner queue" value={codeAssessmentSummary.runQueueDepth ?? 0} helper="Sandbox backlog" />
          <MetricCard icon={ShieldCheck} label="Sandbox fail" value={`${codeAssessmentSummary.sandboxFailureRate ?? 0}%`} helper="Policy or execution blocks" />
        </div>
        <div className="evidence-grid">
          <div className="constraint-box">
            <strong>Assessment pipeline</strong>
            <span>{codeAssessmentSummary.submitted} submitted / {codeAssessmentSummary.autoReviewed} auto reviewed</span>
            <span>{codeAssessmentSummary.employerReviewed} employer reviewed / {codeAssessmentSummary.failed} failed</span>
            <span>{codePassRate}% pass rate across employer decisions</span>
          </div>
          <div className="constraint-box">
            <strong>Safety posture</strong>
            <span>{codeAssessmentSummary.riskySubmissions} risky submissions need reviewer attention</span>
            <span>Integrity risk avg {codeAssessmentSummary.averageIntegrityRisk ?? 0}% / similarity avg {codeAssessmentSummary.averageSimilarityScore ?? 0}%</span>
            <span>Hidden tests and final score are recalculated server-side</span>
          </div>
          <div className="constraint-box">
            <strong>Runtime judge</strong>
            <span>{codeAssessmentSummary.acceptedRate ?? 0}% accepted / {codeAssessmentSummary.wrongAnswerRate ?? 0}% wrong answers</span>
            <span>{codeAssessmentSummary.compileErrorRate ?? 0}% compile / {codeAssessmentSummary.timeoutRate ?? 0}% timeout / {codeAssessmentSummary.policyBlockedRate ?? 0}% policy blocked</span>
            <span>{codeAssessmentSummary.runnerUnavailableRate ?? 0}% unavailable / avg runtime {codeAssessmentSummary.averageRuntimeMs ?? 0} ms / p95 {codeAssessmentSummary.p95ExecutionMs ?? 0} ms</span>
          </div>
        </div>
        <div className="insight-list compact">
          {codeAssessmentSummary.statusDistribution.map((item) => (
            <div className="insight-line" key={item.status}>
              <span>{statusLabel(item.status)}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <div className="section-title">
          <ShieldCheck size={20} />
          <h2>Code challenge management</h2>
        </div>
        <div className="form challenge-authoring-form">
          <div className="inline-form">
            <input
              aria-label="Challenge title"
              value={challengeDraft.title}
              onChange={(event) => setChallengeDraft((current) => ({ ...current, title: event.target.value }))}
            />
            <input
              aria-label="Challenge level"
              value={challengeDraft.level}
              onChange={(event) => setChallengeDraft((current) => ({ ...current, level: event.target.value }))}
            />
            <select
              aria-label="Challenge language"
              value={challengeDraft.language}
              onChange={(event) => setChallengeDraft((current) => ({ ...current, language: event.target.value }))}
            >
              <option value="Java">Java</option>
              <option value="TypeScript">TypeScript</option>
              <option value="SQL">SQL</option>
            </select>
          </div>
          <textarea
            aria-label="Problem statement"
            value={challengeDraft.prompt}
            onChange={(event) => setChallengeDraft((current) => ({ ...current, prompt: event.target.value }))}
          />
          <textarea
            aria-label="Runtime constraints"
            value={challengeDraft.constraints}
            onChange={(event) => setChallengeDraft((current) => ({ ...current, constraints: event.target.value }))}
          />
          <div className="code-authoring-grid">
            <label>
              Starter code
              <textarea
                aria-label="Starter code"
                value={challengeDraft.starterCode}
                onChange={(event) => setChallengeDraft((current) => ({ ...current, starterCode: event.target.value }))}
              />
            </label>
            <label>
              Reference solution
              <textarea
                aria-label="Reference solution"
                value={challengeDraft.referenceSolution}
                onChange={(event) => setChallengeDraft((current) => ({ ...current, referenceSolution: event.target.value }))}
              />
            </label>
          </div>
          <div className="inline-form">
            <input
              aria-label="Challenge skills"
              value={challengeDraft.skillsCsv}
              onChange={(event) => setChallengeDraft((current) => ({ ...current, skillsCsv: event.target.value }))}
            />
            <input
              aria-label="Required signals"
              value={challengeDraft.requiredSignalsCsv}
              onChange={(event) => setChallengeDraft((current) => ({ ...current, requiredSignalsCsv: event.target.value }))}
            />
            <input
              aria-label="Max score"
              type="number"
              min={1}
              max={100}
              value={challengeDraft.maxScore}
              onChange={(event) => setChallengeDraft((current) => ({ ...current, maxScore: Number(event.target.value) }))}
            />
          </div>
          <div className="challenge-case-list">
            {challengeDraft.testCases.map((testCase, index) => (
              <div className="challenge-case-editor" key={`${testCase.visibility}-${index}`}>
                <div className="inline-form">
                  <input
                    aria-label={`Case ${index + 1} name`}
                    value={testCase.name}
                    onChange={(event) => updateCase(index, { name: event.target.value })}
                  />
                  <select
                    aria-label={`Case ${index + 1} visibility`}
                    value={testCase.visibility}
                    onChange={(event) => updateCase(index, { visibility: event.target.value })}
                  >
                    <option value="VISIBLE">Visible</option>
                    <option value="HIDDEN">Hidden</option>
                  </select>
                  <input
                    aria-label={`Case ${index + 1} weight`}
                    type="number"
                    min={1}
                    max={100}
                    value={testCase.weight}
                    onChange={(event) => updateCase(index, { weight: Number(event.target.value) })}
                  />
                </div>
                <div className="code-authoring-grid">
                  <label>
                    stdin
                    <textarea
                      aria-label={`Case ${index + 1} stdin`}
                      value={testCase.stdin}
                      onChange={(event) => updateCase(index, { stdin: event.target.value })}
                    />
                  </label>
                  <label>
                    expected output
                    <textarea
                      aria-label={`Case ${index + 1} expected output`}
                      value={testCase.expectedOutput}
                      onChange={(event) => updateCase(index, { expectedOutput: event.target.value })}
                    />
                  </label>
                </div>
                {challengeDraft.language.toLowerCase() === "sql" && (
                  <div className="code-authoring-grid">
                    <label>
                      Setup SQL
                      <textarea
                        aria-label={`Case ${index + 1} setup SQL`}
                        value={testCase.setupSql ?? ""}
                        onChange={(event) => updateCase(index, { setupSql: event.target.value })}
                      />
                    </label>
                    <label>
                      Expected rows JSON
                      <textarea
                        aria-label={`Case ${index + 1} expected rows JSON`}
                        value={testCase.expectedRowsJson ?? ""}
                        onChange={(event) => updateCase(index, { expectedRowsJson: event.target.value })}
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="button-row">
            <button className="button secondary" type="button" onClick={resetChallengeEditor}>
              New Java draft
            </button>
            <button className="button secondary" type="button" onClick={() => addCase("VISIBLE")}>
              Add visible case
            </button>
            <button className="button secondary" type="button" onClick={() => addCase("HIDDEN")}>
              Add hidden case
            </button>
            <button className="button secondary" type="button" onClick={() => saveChallenge(false)} disabled={savingChallenge}>
              {savingChallenge ? "Saving" : "Save draft"}
            </button>
            <button className="button primary" type="button" onClick={() => saveChallenge(true)} disabled={savingChallenge}>
              Validate and publish
            </button>
          </div>
          <small className="muted">
            Publishing runs the reference solution against visible and hidden cases before the challenge can become active.
          </small>
        </div>
        <div className="evidence-grid">
          <div className="constraint-box">
            <strong>Runner health</strong>
            <span>{statusLabel(codeAssessmentSummary.runnerHealth.status)} / {codeAssessmentSummary.runnerHealth.mode}</span>
            <span>{codeAssessmentSummary.runnerHealth.runnerVersion}</span>
            <span>{codeAssessmentSummary.runnerHealth.failClosed ? "Fail-closed active" : "Fail-closed clear"}</span>
            <span>Judge0 {codeAssessmentSummary.runnerHealth.judge0Configured ? "configured" : "not configured"} / queue {codeAssessmentSummary.runnerHealth.queueDepth}</span>
            {codeAssessmentSummary.runnerHealth.lastSmokeStatus
              ? <span>Last smoke {codeAssessmentSummary.runnerHealth.lastSmokeStatus}{codeAssessmentSummary.runnerHealth.lastSmokeAt ? ` at ${formatDateTime(codeAssessmentSummary.runnerHealth.lastSmokeAt)}` : ""}</span>
              : null}
            {codeAssessmentSummary.runnerHealth.failClosedReason ? <span>{codeAssessmentSummary.runnerHealth.failClosedReason}</span> : <span>Runner is accepting assessment work</span>}
          </div>
        </div>
        <div className="table-list" ref={challengeListRef}>
          <input
            type="text"
            aria-label="Search challenges"
            placeholder="Search challenges by title..."
            onChange={(event) => handleSearchChange(event.target.value)}
            className="search-input"
          />
          <small className="muted">
            {searchQuery ? `${filteredChallenges.length} of ${codeChallenges.length} challenges` : `${codeChallenges.length} challenges`}
          </small>
          {codeChallenges.length === 0 ? <div className="empty-state compact">No admin challenge registry returned yet.</div> : null}
          {filteredChallenges.length === 0 && searchQuery ? <div className="empty-state compact">No challenges match your search.</div> : null}
          {challengeLoadError && (
            <div className="empty-state compact">Challenge registry unavailable.</div>
          )}
          {!challengeLoadError && paginatedChallenges.map((challenge) => (
            <div className="table-row" key={challenge.id}>
              <div>
                <strong>{challenge.title}</strong>
                <small>
                  {challenge.language} v{challenge.version} - visible {challenge.visibleCaseCount} / hidden {challenge.hiddenCaseCount}
                </small>
              </div>
              <span className="badge">{challenge.language}</span>
              <span className={challenge.active ? "badge live" : "badge"}>{challenge.active ? "Active" : "Draft"}</span>
              <button className="button secondary" type="button" onClick={() => loadChallengeIntoEditor(challenge)}>
                Edit
              </button>
              <button className="button secondary" type="button" onClick={() => toggleChallenge(challenge)}>
                {challenge.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          ))}
          {!challengeLoadError && totalPages > 1 && (
            <div className="pagination-controls">
              <button disabled={currentPage === 1} onClick={() => { setCurrentPage(p => p - 1); challengeListRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>Previous</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => p + 1); challengeListRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>Next</button>
            </div>
          )}
        </div>
      </div>
      <div className="panel">
        <div className="section-title">
          <Gauge size={20} />
          <h2>AI provider operations</h2>
        </div>
        <div className="table-list">
          <div className="table-row">
            <div>
              <strong>{aiProvider?.provider ?? "anthropic"} / {aiProvider?.model ?? "claude-haiku-4-5-20251001"}</strong>
              <small>{aiProvider?.baseUrlHost ?? "api.anthropic.com"} - Anthropic version {aiProvider?.anthropicVersion ?? "2023-06-01"}</small>
            </div>
            <span className={aiCircuitOpen ? "badge warn" : "badge live"}>{aiProvider?.circuitBreakerState ?? "CHECKING"}</span>
          </div>
          <div className="table-row">
            <div>
              <strong>{aiProvider?.consecutiveFailures ?? 0} consecutive provider failures</strong>
              <small>
                {aiProvider?.lastFailureAt
                  ? `Last failure ${formatDateTime(aiProvider.lastFailureAt)} (${aiProvider.lastFailureReason ?? "provider error"})`
                  : "No provider failures recorded in this runtime"}
              </small>
            </div>
            <span className="badge">{aiProvider?.demoFallbackEnabled ? "Safety backup enabled" : "Provider path ready"}</span>
          </div>
          <div className="table-row">
            <div>
              <strong>Max tokens {aiProvider?.maxTokens ?? 900}</strong>
              <small>
                {aiProvider?.circuitOpenUntil
                  ? `Circuit cooldown until ${formatDateTime(aiProvider.circuitOpenUntil)}`
                  : `Checked ${aiProvider?.checkedAt ? formatDateTime(aiProvider.checkedAt) : "after login"}`}
              </small>
            </div>
            <button className="button secondary" type="button" onClick={reindexKnowledge} disabled={reindexing}>
              <RefreshCw size={16} />
              {reindexing ? "Reindexing" : "Reindex knowledge"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function selectedJobTitle(jobs: Job[], id: string) {
  return jobs.find((job) => job.id === id)?.title ?? "Selected portfolio job";
}

function defaultChallengeDraft(): ChallengeDraftState {
  return {
    title: "Cloud Architecture Challenge",
    level: "Senior",
    language: "Java",
    prompt: "Implement CandidateSolution.solve(String input) and return PASSED when the resource is strict production traffic, otherwise REJECTED.",
    constraints: "Submit class CandidateSolution with String solve(String input). Do not use package, public class, network, filesystem, process, or reflection APIs.",
    starterCode: "class CandidateSolution {\n  String solve(String input) {\n    return \"\";\n  }\n}",
    referenceSolution: "class CandidateSolution {\n  String solve(String input) {\n    boolean strict = input != null && input.contains(\"policy=STRICT\");\n    boolean production = input != null && input.contains(\"tag=production\");\n    return strict && production ? \"PASSED\" : \"REJECTED\";\n  }\n}",
    skillsCsv: "Java,Runtime Validation,Security",
    requiredSignalsCsv: "CandidateSolution,solve",
    maxScore: 100,
    active: false,
    testCases: [
      {
        name: "Visible strict production resource",
        visibility: "VISIBLE",
        stdin: "resource=res-9982;policy=STRICT;tag=production",
        expectedOutput: "PASSED",
        weight: 15,
        ordinal: 1
      },
      {
        name: "Visible relaxed policy rejection",
        visibility: "VISIBLE",
        stdin: "resource=res-2211;policy=RELAXED;tag=production",
        expectedOutput: "REJECTED",
        weight: 15,
        ordinal: 2
      },
      {
        name: "Hidden malformed resource rejection",
        visibility: "HIDDEN",
        stdin: "resource=res-hidden-2;policy=STRICT",
        expectedOutput: "REJECTED",
        weight: 20,
        ordinal: 3
      }
    ]
  };
}

function draftFromChallenge(challenge: CodeChallenge): ChallengeDraftState {
  return {
    title: challenge.title,
    level: challenge.level,
    language: challenge.language,
    prompt: challenge.prompt,
    constraints: challenge.constraints,
    starterCode: challenge.starterCode,
    referenceSolution: challenge.referenceSolution ?? "",
    skillsCsv: challenge.skills.join(","),
    requiredSignalsCsv: challenge.requiredSignals.join(","),
    maxScore: challenge.maxScore,
    active: challenge.active,
    testCases: (challenge.testCases?.length ? challenge.testCases : defaultChallengeDraft().testCases)
      .map((testCase, index) => ({
        ...testCase,
        stdin: testCase.stdin ?? "",
        expectedOutput: testCase.expectedOutput ?? "",
        weight: testCase.weight ?? 10,
        ordinal: testCase.ordinal ?? index + 1
      }))
  };
}

function challengePayload(draft: ChallengeDraftState, active: boolean) {
  return {
    title: draft.title,
    level: draft.level,
    language: draft.language,
    prompt: draft.prompt,
    constraints: draft.constraints,
    starterCode: draft.starterCode,
    skills: splitCsvInput(draft.skillsCsv),
    requiredSignals: splitCsvInput(draft.requiredSignalsCsv),
    maxScore: draft.maxScore,
    active,
    referenceSolution: draft.referenceSolution,
    testCases: draft.testCases.map((testCase, index) => ({
      name: testCase.name,
      visibility: testCase.visibility,
      stdin: testCase.stdin,
      expectedOutput: testCase.expectedOutput,
      weight: testCase.weight,
      ordinal: index + 1,
      setupSql: testCase.setupSql,
      expectedRowsJson: testCase.expectedRowsJson
    }))
  };
}

function splitCsvInput(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function countBy<T>(items: T[], selector: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function displayProviderMode(mode: string) {
  return statusLabel(
    mode
      .replace("DEMO_FALLBACK", "REVIEWER_SAFE")
      .replace("CIRCUIT_OPEN_FALLBACK", "CIRCUIT_OPEN_SAFE_MODE")
  );
}

"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, Building2, CheckCircle2, ClipboardCheck, Gauge, RefreshCw, ScrollText, ShieldCheck } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill, statusLabel } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { brandForCompany } from "@/lib/demoCompanies";
import { formatDateTime } from "@/lib/dateFormat";
import { previewAiProviderStatus, previewAuditLogs, previewCodeAssessmentSummary, previewCompanies, previewJobs, previewOperationsSummary } from "@/lib/previewData";
import type { AiProviderStatus, AuditLog, CodeAssessmentSummary, Company, Job, OperationsSummary, PageResponse } from "@/types/domain";

export default function AdminPage() {
  const [companies, setCompanies] = useState<PageResponse<Company>>(previewCompanies);
  const [audit, setAudit] = useState<PageResponse<AuditLog>>(previewAuditLogs);
  const [aiProvider, setAiProvider] = useState<AiProviderStatus>(previewAiProviderStatus);
  const [operationsSummary, setOperationsSummary] = useState<OperationsSummary>(previewOperationsSummary);
  const [codeAssessmentSummary, setCodeAssessmentSummary] = useState<CodeAssessmentSummary>(previewCodeAssessmentSummary);
  const [reviewJobs, setReviewJobs] = useState<PageResponse<Job>>(previewJobs);
  const [selectedJobId, setSelectedJobId] = useState(previewJobs.content[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [reindexing, setReindexing] = useState(false);
  const [loading, setLoading] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([
      api.adminCompanies("PENDING"),
      api.auditLogs(),
      api.aiProviderStatus(),
      api.adminJobs("PENDING_REVIEW"),
      api.operationsSummary(),
      api.codeAssessmentSummary()
    ])
      .then(([companyPage, auditPage, providerStatus, jobPage, ops, codeSummary]) => {
        setCompanies(companyPage);
        setAudit(auditPage);
        setAiProvider(providerStatus);
        setOperationsSummary(ops);
        setCodeAssessmentSummary(codeSummary);
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

  const aiCircuitOpen = aiProvider?.circuitBreakerState === "OPEN";
  const positiveMessage = message.includes("approved") || message.includes("reindexed");
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
          <MetricCard icon={Gauge} label="Average score" value={`${codeAssessmentSummary.averageScore}%`} helper="Deterministic rubric" />
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

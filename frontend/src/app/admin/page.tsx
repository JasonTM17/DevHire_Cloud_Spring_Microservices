"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, Building2, ClipboardCheck, Gauge, RefreshCw, ScrollText, ShieldCheck } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { brandForCompany } from "@/lib/demoCompanies";
import type { AiProviderStatus, AuditLog, Company, PageResponse } from "@/types/domain";

export default function AdminPage() {
  const [companies, setCompanies] = useState<PageResponse<Company> | null>(null);
  const [audit, setAudit] = useState<PageResponse<AuditLog> | null>(null);
  const [aiProvider, setAiProvider] = useState<AiProviderStatus | null>(null);
  const [jobId, setJobId] = useState("");
  const [message, setMessage] = useState("");
  const [reindexing, setReindexing] = useState(false);

  function load() {
    Promise.all([api.companies(), api.auditLogs(), api.aiProviderStatus()])
      .then(([companyPage, auditPage, providerStatus]) => {
        setCompanies(companyPage);
        setAudit(auditPage);
        setAiProvider(providerStatus);
      })
      .catch((ex) => setMessage(ex instanceof Error ? ex.message : "Cannot load admin dashboard"));
  }

  useEffect(load, []);

  async function approveCompany(id: string) {
    await api.approveCompany(id);
    load();
  }

  async function approveJob() {
    if (!jobId) return;
    try {
      await api.approveJob(jobId);
      setMessage("Job approved.");
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
        <MetricCard icon={Activity} label="Audit events" value={audit?.totalElements ?? 0} helper="Kafka ingested" />
        <MetricCard icon={ShieldCheck} label="Pending" value={companies?.content.filter((item) => item.status === "PENDING").length ?? 0} helper="Needs admin action" />
        <MetricCard icon={Bot} label="AI mode" value={aiProvider?.mode ?? "UNKNOWN"} helper={aiProvider?.apiKeyConfigured ? "Claude API" : "Fallback safe"} />
      </div>
      {message ? <p className={positiveMessage ? "success" : "error"}>{message}</p> : null}
      <div className="split-grid">
        <div className="panel">
          <div className="section-title">
            <ClipboardCheck size={20} />
            <h2>Company reviews</h2>
          </div>
          <div className="table-list">
            {companies?.content.map((company) => (
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
            <input value={jobId} onChange={(event) => setJobId(event.target.value)} placeholder="Pending job ID" />
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
          <div className="stack">
            {audit?.content.slice(0, 12).map((item) => (
              <div className="audit-item" key={item.id}>
                <div className="status-line">
                  <strong>{item.action}</strong>
                  <StatusPill value={item.actorRole} />
                </div>
                <span className="muted">{item.actorEmail}</span>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
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
              <strong>{aiProvider?.provider ?? "anthropic"} / {aiProvider?.model ?? "loading"}</strong>
              <small>{aiProvider?.baseUrlHost ?? "provider host"} · Anthropic version {aiProvider?.anthropicVersion ?? "unknown"}</small>
            </div>
            <span className={aiCircuitOpen ? "badge warn" : "badge live"}>{aiProvider?.circuitBreakerState ?? "CHECKING"}</span>
          </div>
          <div className="table-row">
            <div>
              <strong>{aiProvider?.consecutiveFailures ?? 0} consecutive provider failures</strong>
              <small>
                {aiProvider?.lastFailureAt
                  ? `Last failure ${new Date(aiProvider.lastFailureAt).toLocaleString()} (${aiProvider.lastFailureReason ?? "provider error"})`
                  : "No provider failures recorded in this runtime"}
              </small>
            </div>
            <span className="badge">{aiProvider?.demoFallbackEnabled ? "Fallback enabled" : "Fallback disabled"}</span>
          </div>
          <div className="table-row">
            <div>
              <strong>Max tokens {aiProvider?.maxTokens ?? "unknown"}</strong>
              <small>
                {aiProvider?.circuitOpenUntil
                  ? `Circuit cooldown until ${new Date(aiProvider.circuitOpenUntil).toLocaleString()}`
                  : `Checked ${aiProvider?.checkedAt ? new Date(aiProvider.checkedAt).toLocaleString() : "after login"}`}
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

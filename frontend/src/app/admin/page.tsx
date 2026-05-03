"use client";

import { useEffect, useState } from "react";
import { Activity, Building2, ClipboardCheck, ScrollText, ShieldCheck } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { brandForCompany } from "@/lib/demoCompanies";
import type { AuditLog, Company, PageResponse } from "@/types/domain";

export default function AdminPage() {
  const [companies, setCompanies] = useState<PageResponse<Company> | null>(null);
  const [audit, setAudit] = useState<PageResponse<AuditLog> | null>(null);
  const [jobId, setJobId] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    Promise.all([api.companies(), api.auditLogs()])
      .then(([companyPage, auditPage]) => {
        setCompanies(companyPage);
        setAudit(auditPage);
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
      </div>
      {message ? <p className={message.includes("approved") ? "success" : "error"}>{message}</p> : null}
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
    </section>
  );
}

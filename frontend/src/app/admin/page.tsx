"use client";

import { useEffect, useState } from "react";
import { Activity, Building2, ShieldCheck } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
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
    <section className="page-stack">
      <div>
        <p className="eyebrow">Admin workspace</p>
        <h1>Review console</h1>
      </div>
      <div className="metrics-row">
        <MetricCard icon={Building2} label="Companies" value={companies?.totalElements ?? 0} />
        <MetricCard icon={Activity} label="Audit events" value={audit?.totalElements ?? 0} />
        <MetricCard icon={ShieldCheck} label="Pending" value={companies?.content.filter((item) => item.status === "PENDING").length ?? 0} />
      </div>
      {message ? <p className={message.includes("approved") ? "success" : "error"}>{message}</p> : null}
      <div className="split-grid">
        <div className="panel">
          <h2>Company reviews</h2>
          <div className="table-list">
            {companies?.content.map((company) => (
              <div className="table-row" key={company.id}>
                <span>{company.name}</span>
                <StatusPill value={company.status} />
                {company.status === "PENDING" ? (
                  <button className="button ghost" type="button" onClick={() => approveCompany(company.id)}>
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
          <h2>Audit log</h2>
          <div className="stack">
            {audit?.content.slice(0, 12).map((item) => (
              <div className="audit-item" key={item.id}>
                <strong>{item.action}</strong>
                <span>{item.actorEmail}</span>
                <small>{new Date(item.createdAt).toLocaleString()}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

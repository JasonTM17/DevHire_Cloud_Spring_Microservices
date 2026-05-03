"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ClipboardList, GitPullRequestArrow, Plus, Send, UsersRound } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { brandForCompany } from "@/lib/demoCompanies";
import type { Application, Company, PageResponse } from "@/types/domain";

export default function EmployerPage() {
  const [companies, setCompanies] = useState<PageResponse<Company> | null>(null);
  const [companyName, setCompanyName] = useState("Portfolio Labs");
  const [jobTitle, setJobTitle] = useState("Senior Java Platform Engineer");
  const [jobId, setJobId] = useState("");
  const [applications, setApplications] = useState<PageResponse<Application> | null>(null);
  const [message, setMessage] = useState("");

  const approvedCompany = useMemo(
    () => companies?.content.find((company) => company.status === "APPROVED"),
    [companies]
  );

  function loadCompanies() {
    api.companies().then(setCompanies).catch((ex) => setMessage(ex instanceof Error ? ex.message : "Cannot load companies"));
  }

  useEffect(loadCompanies, []);

  async function createCompany() {
    setMessage("");
    try {
      await api.createCompany({
        name: companyName,
        website: "https://portfolio.example",
        size: "51-200",
        industry: "Software",
        description: "Engineering organization hiring backend and platform talent."
      });
      setMessage("Company submitted.");
      loadCompanies();
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Cannot create company");
    }
  }

  async function createJob() {
    if (!approvedCompany) {
      setMessage("No approved company available.");
      return;
    }
    try {
      const job = await api.createJob({
        companyId: approvedCompany.id,
        title: jobTitle,
        description: "Build Java microservices, Kafka workflows, and cloud-native hiring APIs.",
        requirements: "Java 21, Spring Boot, PostgreSQL, Kafka, observability.",
        benefits: "Remote-friendly team, learning budget, modern platform ownership.",
        salaryMin: 3000,
        salaryMax: 6500,
        location: "Ho Chi Minh City / Remote",
        level: "Senior",
        type: "Full-time",
        skills: ["Java", "Spring Boot", "Kafka", "PostgreSQL"]
      });
      await api.submitJobReview(job.id);
      setJobId(job.id);
      setMessage(`Job submitted for review: ${job.id}`);
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Cannot create job");
    }
  }

  async function loadApplications() {
    if (!jobId) return;
    setApplications(await api.applicationsForJob(jobId));
  }

  async function moveApplication(id: string) {
    await api.updateApplicationStatus(id, "INTERVIEW");
    await loadApplications();
  }

  return (
    <section className="page-stack" data-testid="employer-dashboard">
      <div className="hero-strip">
        <div>
        <p className="eyebrow">Employer workspace</p>
        <h1>Company and pipeline</h1>
          <p>
            Operate company approval, job submission, and applicant review as one workflow backed by separate services,
            transactions, and Kafka events.
          </p>
        </div>
        <div className="hero-actions">
          <span className="badge live">Company approval required</span>
          <span className="badge">Job review workflow</span>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={Building2} label="Companies" value={companies?.totalElements ?? 0} helper="Owned by employer" />
        <MetricCard icon={ClipboardList} label="Applications" value={applications?.totalElements ?? 0} helper="For selected job" />
        <MetricCard icon={UsersRound} label="Pipeline" value="Interview" helper="Status mutation ready" />
      </div>
      {message ? <p className={message.includes("Cannot") || message.includes("No approved") ? "error" : "success"}>{message}</p> : null}
      <div className="split-grid">
        <div className="panel">
          <div className="section-title">
            <Building2 size={20} />
            <h2>Company onboarding</h2>
          </div>
          <div className="form inline-form">
            <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            <button className="button primary" type="button" onClick={createCompany}>
              <Plus size={16} />
              Create
            </button>
          </div>
          <div className="table-list">
            {companies?.content.map((company) => (
              <div className="table-row" key={company.id}>
                <div className="company-line">
                  <CompanyLogo brand={brandForCompany(company)} size="sm" />
                  <span>
                    <strong>{company.name}</strong>
                    <span>{company.industry ?? "Software"} / {company.size ?? "Team size pending"}</span>
                  </span>
                </div>
                <StatusPill value={company.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <div className="section-title">
            <GitPullRequestArrow size={20} />
            <h2>Job workflow</h2>
          </div>
          <div className="form">
            <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
            <button className="button primary" type="button" onClick={createJob}>
              <Send size={16} />
              Create and submit
            </button>
          </div>
          <div className="form inline-form">
            <input value={jobId} onChange={(event) => setJobId(event.target.value)} placeholder="Job ID" />
            <button className="button secondary" type="button" onClick={loadApplications}>
              Load applicants
            </button>
          </div>
          <div className="table-list">
            {applications?.content.map((item) => (
              <div className="table-row" key={item.id}>
                <span>
                  <strong>Candidate {item.candidateId.slice(0, 8)}</strong>
                  <small>CV metadata captured</small>
                </span>
                <button className="button ghost" type="button" onClick={() => moveApplication(item.id)}>
                  <StatusPill value={item.status} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

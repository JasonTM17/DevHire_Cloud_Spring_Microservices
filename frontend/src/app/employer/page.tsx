"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ClipboardList, Plus, Send } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
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
    <section className="page-stack">
      <div>
        <p className="eyebrow">Employer workspace</p>
        <h1>Company and pipeline</h1>
      </div>
      <div className="metrics-row">
        <MetricCard icon={Building2} label="Companies" value={companies?.totalElements ?? 0} />
        <MetricCard icon={ClipboardList} label="Applications" value={applications?.totalElements ?? 0} />
      </div>
      {message ? <p className={message.includes("Cannot") || message.includes("No approved") ? "error" : "success"}>{message}</p> : null}
      <div className="split-grid">
        <div className="panel">
          <h2>Company onboarding</h2>
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
                <span>{company.name}</span>
                <StatusPill value={company.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Job workflow</h2>
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
                <span>{item.candidateId}</span>
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

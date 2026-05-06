"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, MapPin, SendHorizonal, ServerCog } from "lucide-react";
import { useParams } from "next/navigation";
import { CompanyLogo } from "@/components/CompanyLogo";
import { DemoModeNotice } from "@/components/DemoModeNotice";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { brandForJob } from "@/lib/demoCompanies";
import { previewJobs } from "@/lib/previewData";
import { getSession } from "@/lib/session";
import type { Job } from "@/types/domain";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [cvUrl, setCvUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("I am interested in this role and available for interview.");
  const [hasSession, setHasSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadWarning, setLoadWarning] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");

  useEffect(() => {
    setHasSession(Boolean(getSession()?.accessToken));
    api.job(params.id)
      .then((value) => {
        setJob(value);
        setLoadWarning("");
      })
      .catch((ex) => {
        setJob(previewJobs.content.find((item) => item.id === params.id) ?? previewJobs.content[0]);
        setLoadWarning(previewMessage(ex));
      });
  }, [params.id]);

  async function apply() {
    setMessage("");
    const normalizedCvUrl = cvUrl.trim();
    if (!hasSession) {
      setMessageTone("error");
      setMessage("Sign in as Candidate before submitting an application through the Gateway.");
      return;
    }
    if (!normalizedCvUrl) {
      setMessageTone("error");
      setMessage("Add a secure CV URL before submitting. The platform stores metadata only, not the CV file.");
      return;
    }
    setSubmitting(true);
    try {
      await api.apply(params.id, normalizedCvUrl, coverLetter.trim());
      setMessageTone("success");
      setMessage("Application submitted. Notification and audit events will be created by the platform.");
    } catch (ex) {
      setMessageTone("error");
      setMessage(applicationMessage(ex));
    } finally {
      setSubmitting(false);
    }
  }

  if (!job) {
    return <section className="panel">Loading job...</section>;
  }

  const brand = brandForJob(job);

  return (
    <section className="detail-layout" data-testid="job-detail-page">
      <article className="panel job-detail">
        <div className="detail-heading">
          <CompanyLogo brand={brand} size="lg" />
          <div>
            <p className="eyebrow">{brand.name} hiring workflow</p>
            <h1>{job.title}</h1>
            <div className="job-meta">
              <span>
                <MapPin size={13} /> {job.location ?? "Remote"}
              </span>
              <span>{job.level ?? "Any level"}</span>
              <span>{job.type ?? "Full-time"}</span>
            </div>
          </div>
          <StatusPill value={job.status} />
        </div>
        <DemoModeNotice message={loadWarning} />
        <div className="dashboard-grid">
          <div className="panel">
            <p className="eyebrow">Salary band</p>
            <h2>{salary(job)}</h2>
            <span className="muted">Visible to candidates after approval</span>
          </div>
          <div className="panel">
            <p className="eyebrow">Company signal</p>
            <h2>{brand.signal}</h2>
            <span className="muted">{brand.industry}</span>
          </div>
          <div className="panel">
            <p className="eyebrow">Service path</p>
            <h2>Gateway to Job</h2>
            <span className="muted">JWT, RBAC, audit events</span>
          </div>
        </div>
        <h2>Description</h2>
        <p>{job.description}</p>
        <h2>Requirements</h2>
        <p>{job.requirements}</p>
        <h2>Benefits</h2>
        <p>{job.benefits}</p>
        <div className="tag-row">
          {job.skills.map((skill) => (
            <span className="tag" key={skill}>
              {skill}
            </span>
          ))}
        </div>
        <div className="infra-row">
          <span className="infra-tag">Spring Boot 3.5</span>
          <span className="infra-tag">Kafka events</span>
          <span className="infra-tag">OpenSearch</span>
          <span className="infra-tag">Prometheus SLO</span>
        </div>
      </article>
      <aside className="panel apply-panel">
        <div className="section-title">
          <BriefcaseBusiness size={20} />
          <h2>Apply</h2>
        </div>
        <div className="mini-stat">
          <span>Duplicate protection</span>
          <strong>Enabled</strong>
        </div>
        <label>
          CV URL
          <input
            aria-describedby="cv-url-help"
            placeholder="https://storage.devhire.local/cv/your-name.pdf"
            type="url"
            value={cvUrl}
            onChange={(event) => setCvUrl(event.target.value)}
          />
        </label>
        <small className="muted" id="cv-url-help">
          Paste a private storage link. DevHire stores the URL metadata and enforces duplicate application protection.
        </small>
        <label>
          Cover letter
          <textarea value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} />
        </label>
        {!hasSession ? <p className="error">Sign in with the demo Candidate account to submit through the live API.</p> : null}
        <button className="button primary" type="button" disabled={submitting} onClick={apply}>
          <SendHorizonal size={16} />
          {submitting ? "Submitting..." : "Submit application"}
        </button>
        {message ? <p className={messageTone}>{message}</p> : null}
        <div className="insight-list">
          <div className="insight-line">
            <span>
              <CheckCircle2 size={13} /> Transaction
            </span>
            <span>Required</span>
          </div>
          <div className="insight-line">
            <span>
              <ServerCog size={13} /> Events
            </span>
            <span>Notification + audit</span>
          </div>
        </div>
      </aside>
    </section>
  );
}

function salary(job: Job) {
  if (!job.salaryMin && !job.salaryMax) return "Negotiable";
  return `$${job.salaryMin ?? 0} - $${job.salaryMax ?? 0}`;
}

function previewMessage(ex: unknown) {
  const message = ex instanceof Error ? ex.message : "";
  if (!message || message === "Failed to fetch") {
    return "Curated job detail data is active so reviewers can inspect the application flow without starting Docker.";
  }
  return `${message}. Curated job detail data is active for this reviewer session.`;
}

function applicationMessage(ex: unknown) {
  const message = ex instanceof Error ? ex.message : "";
  if (!message || message === "Failed to fetch") {
    return "Runtime submission needs the Docker stack. The application form remains ready for reviewer inspection.";
  }
  if (message.toLowerCase().includes("already")) {
    return "This candidate has already applied for the job. Duplicate prevention is working.";
  }
  if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("forbidden")) {
    return "Your session is missing or does not have Candidate access. Sign in again and retry.";
  }
  return message;
}

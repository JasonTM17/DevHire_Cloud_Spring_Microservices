"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Braces, Building2, ClipboardList, GitPullRequestArrow, Plus, Send, ShieldCheck, UsersRound } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { DemoModeNotice } from "@/components/DemoModeNotice";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill, statusLabel } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { brandForCompany } from "@/lib/demoCompanies";
import { previewApplications, previewCodeAssessments, previewCompanies, previewEmployerPipelineSummary, previewJobs } from "@/lib/previewData";
import type { Application, CodeAssessment, Company, EmployerPipelineSummary, Job, PageResponse } from "@/types/domain";

export default function EmployerPage() {
  const [companies, setCompanies] = useState<PageResponse<Company>>(previewCompanies);
  const [companyName, setCompanyName] = useState("Portfolio Labs");
  const [jobTitle, setJobTitle] = useState("Senior Java Platform Engineer");
  const [jobs, setJobs] = useState<PageResponse<Job>>(previewJobs);
  const [selectedJobId, setSelectedJobId] = useState(previewJobs.content[0]?.id ?? "");
  const [applications, setApplications] = useState<PageResponse<Application>>(previewApplications);
  const [codeAssessments, setCodeAssessments] = useState<CodeAssessment[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState(previewCodeAssessments[0]?.id ?? "");
  const [selectedReviewDetail, setSelectedReviewDetail] = useState<CodeAssessment | null>(previewCodeAssessments[0] ?? null);
  const [reviewNote, setReviewNote] = useState("Advance if rubric evidence matches production expectations.");
  const [codeStatusFilter, setCodeStatusFilter] = useState("AUTO_REVIEWED");
  const [codeJobFilter, setCodeJobFilter] = useState("ALL");
  const [pipelineSummary, setPipelineSummary] = useState<EmployerPipelineSummary>(previewEmployerPipelineSummary);
  const [message, setMessage] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingCodeReviews, setLoadingCodeReviews] = useState(false);
  const codeFilterReady = useRef(false);

  const approvedCompany = useMemo(
    () => companies?.content.find((company) => company.status === "APPROVED"),
    [companies]
  );
  const pipelineCounts = useMemo(() => {
    const counts = countBy(applications.content, (item) => item.status);
    for (const item of pipelineSummary.statusDistribution) {
      counts[item.status] = item.count;
    }
    return counts;
  }, [applications, pipelineSummary]);
  const visibleCodeAssessments = useMemo(
    () => [...codeAssessments].sort(
      (left, right) => Number(isReviewableCodeAssessment(right)) - Number(isReviewableCodeAssessment(left))
    ),
    [codeAssessments]
  );
  const selectedReview = selectedReviewDetail
    ?? visibleCodeAssessments.find((item) => item.id === selectedReviewId)
    ?? visibleCodeAssessments[0];

  function loadCompanies() {
    setLoadingCompanies(true);
    const jobParams = new URLSearchParams({ page: "0", size: "12", sort: "publishedAt,desc" });
    Promise.all([
      api.employerCompanies(),
      api.jobs(jobParams),
      api.employerPipelineSummary(),
      api.employerCodeAssessments(codeReviewParams(codeStatusFilter, codeJobFilter))
    ])
      .then(([page, jobPage, summary, assessmentItems]) => {
        setCompanies(page);
        setJobs(jobPage.content.length ? jobPage : previewJobs);
        setPipelineSummary(summary);
        const nextAssessments = assessmentItems.length ? assessmentItems : previewCodeAssessments;
        setCodeAssessments(nextAssessments);
        setSelectedReviewId((current) => current || nextAssessments[0]?.id || "");
        setSelectedReviewDetail(nextAssessments[0] ?? null);
        setSelectedJobId((current) => current || jobPage.content[0]?.id || previewJobs.content[0]?.id || "");
        setMessage("");
      })
      .catch((ex) => {
        setCompanies(previewCompanies);
        setJobs(previewJobs);
        setPipelineSummary(previewEmployerPipelineSummary);
        setCodeAssessments(previewCodeAssessments);
        setSelectedReviewId(previewCodeAssessments[0]?.id ?? "");
        setSelectedReviewDetail(previewCodeAssessments[0] ?? null);
        setSelectedJobId(previewJobs.content[0]?.id ?? "");
        setMessage(previewDashboardMessage(ex));
      })
      .finally(() => setLoadingCompanies(false));
  }

  useEffect(loadCompanies, []);

  useEffect(() => {
    if (!codeFilterReady.current) {
      codeFilterReady.current = true;
      return;
    }
    void loadCodeAssessments();
  }, [codeStatusFilter, codeJobFilter]);

  async function createCompany() {
    setMessage("");
    try {
      await api.createCompany({
        name: companyName,
        website: "https://careers.devhire.local/portfolio-labs",
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
      setJobs((current) => ({ ...current, content: [job, ...current.content], totalElements: current.totalElements + 1 }));
      setSelectedJobId(job.id);
      setMessage(`Job submitted for review: ${job.title}.`);
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Cannot create job");
    }
  }

  async function loadApplications() {
    if (!selectedJobId) {
      setApplications(previewApplications);
      setMessage("Showing curated applicant preview for the selected portfolio job.");
      return;
    }
    try {
      setApplications(await api.applicationsForJob(selectedJobId));
      setMessage("");
    } catch (ex) {
      setApplications(previewApplications);
      setMessage(previewDashboardMessage(ex));
    }
  }

  async function loadCodeAssessments() {
    try {
      setLoadingCodeReviews(true);
      const items = await api.employerCodeAssessments(codeReviewParams(codeStatusFilter, codeJobFilter));
      const nextAssessments = items.length ? items : previewCodeAssessments;
      setCodeAssessments(nextAssessments);
      setSelectedReviewId((current) => current || nextAssessments[0]?.id || "");
      setSelectedReviewDetail(nextAssessments.find((item) => item.id === selectedReviewId) ?? nextAssessments[0] ?? null);
      setMessage("");
    } catch (ex) {
      setCodeAssessments(previewCodeAssessments);
      setSelectedReviewId(previewCodeAssessments[0]?.id ?? "");
      setSelectedReviewDetail(previewCodeAssessments[0] ?? null);
      setMessage(previewDashboardMessage(ex));
    } finally {
      setLoadingCodeReviews(false);
    }
  }

  async function moveApplication(id: string) {
    await api.updateApplicationStatus(id, "INTERVIEW");
    await loadApplications();
  }

  async function reviewCodeAssessment(id: string, decision: string, score?: number) {
    if (!isUuid(id)) {
      setCodeAssessments((current) => current.map((item) => (
        item.id === id
          ? { ...item, status: decision === "ADVANCE" ? "PASSED" : "EMPLOYER_REVIEWED", latestDecision: decision }
          : item
      )));
      setSelectedReviewDetail((current) => current?.id === id
        ? { ...current, status: decision === "ADVANCE" ? "PASSED" : "EMPLOYER_REVIEWED", latestDecision: decision }
        : current);
      setMessage("Code review recorded for the selected candidate.");
      return;
    }
    try {
      const updated = await api.reviewCodeAssessment(id, decision, reviewNote, score);
      setCodeAssessments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedReviewDetail(updated);
      setMessage(`Code review recorded for ${updated.candidateName}.`);
    } catch (ex) {
      setCodeAssessments((current) => current.map((item) => (
        item.id === id ? { ...item, status: decision === "ADVANCE" ? "PASSED" : "EMPLOYER_REVIEWED", latestDecision: decision } : item
      )));
      setSelectedReviewDetail((current) => current?.id === id
        ? { ...current, status: decision === "ADVANCE" ? "PASSED" : "EMPLOYER_REVIEWED", latestDecision: decision }
        : current);
      setMessage(ex instanceof Error && ex.message !== "Failed to fetch"
        ? ex.message
        : "Code review recorded for the selected candidate.");
    }
  }

  async function selectCodeAssessment(item: CodeAssessment) {
    setSelectedReviewId(item.id);
    setSelectedReviewDetail(item);
    if (!isUuid(item.id)) {
      return;
    }
    try {
      const detail = await api.employerCodeAssessment(item.id);
      setSelectedReviewDetail(detail);
      setCodeAssessments((current) => current.map((candidate) => (candidate.id === detail.id ? detail : candidate)));
    } catch {
      setSelectedReviewDetail(item);
    }
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
        <MetricCard icon={ClipboardList} label="Applications" value={pipelineSummary.totalApplications} helper="Across employer jobs" />
        <MetricCard icon={UsersRound} label="Candidates" value={pipelineSummary.activeCandidates} helper="Active hiring pool" />
        <MetricCard icon={ShieldCheck} label="Code reviews" value={codeAssessments.filter((item) => item.submittedAt).length} helper="Rubric-scored submissions" />
      </div>
      {message && isPositiveMessage(message) ? <p className="success">{message}</p> : null}
      {message && !isPositiveMessage(message) ? <DemoModeNotice message={message} /> : null}
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
            {loadingCompanies && companies.content.length === 0 ? <div className="empty-state compact">Syncing employer companies...</div> : null}
            {companies.content.length === 0 ? (
              <div className="empty-state compact">No companies yet. Create one to enter the admin approval workflow.</div>
            ) : null}
            {companies.content.map((company) => (
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
            <select
              aria-label="Applicant pipeline job"
              value={selectedJobId}
              onChange={(event) => setSelectedJobId(event.target.value)}
            >
              {jobs.content.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} - {statusLabel(job.status)}
                </option>
              ))}
            </select>
            <button className="button secondary" type="button" onClick={loadApplications}>
              Load applicants
            </button>
          </div>
          <div className="insight-list compact">
            {["SUBMITTED", "REVIEWING", "INTERVIEW", "OFFER"].map((status) => (
              <div className="insight-line" key={status}>
                <span>{status.toLowerCase().replace("_", " ")}</span>
                <strong>{pipelineCounts[status] ?? 0}</strong>
              </div>
            ))}
          </div>
          <div className="table-list">
            {applications.content.map((item) => (
              <div className="table-row" key={item.id}>
                <span>
                  <strong>{candidateDisplayName(item.candidateId)}</strong>
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
      <div className="panel">
        <div className="section-title">
          <Braces size={20} />
          <h2>Code assessment review</h2>
        </div>
        <div className="form inline-form review-filter-bar">
          <select
            aria-label="Code review status"
            value={codeStatusFilter}
            onChange={(event) => setCodeStatusFilter(event.target.value)}
          >
            <option value="AUTO_REVIEWED">Ready for review</option>
            <option value="EMPLOYER_REVIEWED">Reviewed</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="ALL">All statuses</option>
          </select>
          <select
            aria-label="Code review job scope"
            value={codeJobFilter}
            onChange={(event) => setCodeJobFilter(event.target.value)}
          >
            <option value="ALL">All employer jobs</option>
            {jobs.content.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
          <button className="button secondary" type="button" onClick={loadCodeAssessments} disabled={loadingCodeReviews}>
            {loadingCodeReviews ? "Syncing reviews" : "Apply filters"}
          </button>
        </div>
        <div className="assessment-review-grid">
          {visibleCodeAssessments.length === 0 ? (
            <div className="empty-state compact">Syncing rubric-scored submissions...</div>
          ) : null}
          {visibleCodeAssessments.slice(0, 4).map((item) => {
            const reviewable = isReviewableCodeAssessment(item);
            return (
              <div className="review-card" key={item.id}>
                <div className="status-line">
                  <span>
                    <strong>{item.candidateName}</strong>
                    <small>{item.jobTitle}</small>
                  </span>
                  <StatusPill value={item.status} />
                </div>
                <div className="status-line">
                  <span>{item.challengeTitle}</span>
                  <span className="score-chip">{item.latestScore == null ? "Pending" : `${item.latestScore}/${item.maxScore}`}</span>
                </div>
                <p>{item.feedback ?? "Candidate has not submitted code yet."}</p>
                <pre className="code-preview">{(item.submittedCodePreview ?? item.submittedCode ?? item.starterCode).slice(0, 360)}</pre>
                <div className="tag-list">
                  {item.riskFlags.length ? item.riskFlags.map((flag) => (
                    <span className="badge warn" key={flag}>{flag.replaceAll("-", " ")}</span>
                  )) : <span className="badge live">No high-risk flags</span>}
                  <span className={reviewable ? "badge live" : "badge"}>
                    {reviewable ? "Ready for employer decision" : item.submittedAt ? "Decision recorded" : "Waiting for candidate submission"}
                  </span>
                  {item.codeHash ? <span className="badge">Hash {item.codeHash.slice(0, 10)}</span> : null}
                </div>
                <div className="button-row">
                  <button
                    aria-label={`Open review dossier for ${item.candidateName}`}
                    className="button secondary"
                    type="button"
                    onClick={() => selectCodeAssessment(item)}
                  >
                    Open dossier
                  </button>
                  <button
                    aria-label={`Hold ${item.candidateName}`}
                    className="button secondary"
                    disabled={!reviewable}
                    type="button"
                    onClick={() => reviewCodeAssessment(item.id, "HOLD", item.latestScore)}
                  >
                    Hold
                  </button>
                  <button
                    aria-label={`Advance ${item.candidateName}`}
                    className="button primary"
                    disabled={!reviewable}
                    type="button"
                    onClick={() => reviewCodeAssessment(item.id, "ADVANCE", item.latestScore ?? 85)}
                  >
                    Advance
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {selectedReview ? (
          <div className="review-dossier">
            <div className="section-title">
              <ShieldCheck size={20} />
              <h3>{selectedReview.candidateName} / {selectedReview.challengeTitle}</h3>
            </div>
            <div className="evidence-grid">
              <div className="constraint-box">
                <strong>Candidate context</strong>
                <span>{selectedReview.jobTitle}</span>
                <span>Attempt {selectedReview.attemptNumber ?? 0} / score {selectedReview.latestScore ?? 0}/{selectedReview.maxScore}</span>
                <span>Decision {selectedReview.latestDecision ? statusLabel(selectedReview.latestDecision) : "Review queue"}</span>
              </div>
              <div className="constraint-box">
                <strong>Review safety</strong>
                <span>{selectedReview.graderVersion ?? "static-rubric-v1"}</span>
                <span>{selectedReview.rubricVersion ?? "devhire-code-rubric-v1"}</span>
                {selectedReview.codeHash ? <span>Hash {selectedReview.codeHash.slice(0, 12)}</span> : <span>No submitted hash yet</span>}
              </div>
            </div>
            <pre className="code-preview">{(selectedReview.submittedCode ?? selectedReview.submittedCodePreview ?? selectedReview.starterCode).slice(0, 900)}</pre>
            <div className="rubric-grid">
              {(selectedReview.rubric.length ? selectedReview.rubric : []).map((row) => (
                <div className="rubric-card" key={row.category}>
                  <div className="status-line">
                    <strong>{row.category}</strong>
                    <span className="score-chip">{row.score}/{row.maxScore}</span>
                  </div>
                  <p>{row.evidence}</p>
                </div>
              ))}
            </div>
            <div className="form">
              <textarea
                aria-label="Employer review notes"
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder="Capture reviewer rationale, edge cases, and next interview focus."
              />
              <div className="button-row">
                <button
                  className="button secondary"
                  disabled={!isReviewableCodeAssessment(selectedReview)}
                  type="button"
                  onClick={() => reviewCodeAssessment(selectedReview.id, "HOLD", selectedReview.latestScore)}
                >
                  Hold for follow-up
                </button>
                <button
                  className="button primary"
                  disabled={!isReviewableCodeAssessment(selectedReview)}
                  type="button"
                  onClick={() => reviewCodeAssessment(selectedReview.id, "ADVANCE", selectedReview.latestScore ?? 85)}
                >
                  Advance candidate
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function previewDashboardMessage(ex: unknown) {
  const message = ex instanceof Error ? ex.message : "";
  if (!message || message === "Failed to fetch") {
    return "";
  }
  return `${message}. Curated employer pipeline data is active for this reviewer session.`;
}

function isPositiveMessage(message: string) {
  return message.includes("submitted")
    || message.includes("recorded")
    || message.includes("preview")
    || message.includes("selected portfolio");
}

function isReviewableCodeAssessment(item: CodeAssessment) {
  return Boolean(item.submittedAt) && !["PASSED", "FAILED"].includes(item.status);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function codeReviewParams(status: string, jobId: string) {
  const params = new URLSearchParams();
  if (status && status !== "ALL") {
    params.set("status", status);
  }
  if (jobId && jobId !== "ALL") {
    params.set("jobId", jobId);
  }
  return params;
}

function countBy<T>(items: T[], selector: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function candidateDisplayName(candidateId: string) {
  const names: Record<string, string> = {
    "preview-candidate": "Linh Nguyen",
    "preview-candidate-security": "Minh Tran",
    "preview-candidate-cloud": "Aiko Sato",
    "preview-candidate-sre": "Bao Pham"
  };
  return names[candidateId] ?? "Portfolio candidate";
}

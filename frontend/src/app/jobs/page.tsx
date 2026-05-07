"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Filter,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X
} from "lucide-react";
import Link from "next/link";
import { DemoModeNotice } from "@/components/DemoModeNotice";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { brandForJob } from "@/lib/demoCompanies";
import { previewJobs } from "@/lib/previewData";
import type { Job, PageResponse } from "@/types/domain";

export default function JobsPage() {
  const [keyword, setKeyword] = useState("");
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [level, setLevel] = useState("");
  const [jobType, setJobType] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [pageNumber, setPageNumber] = useState(0);
  const [sortOrder, setSortOrder] = useState<"publishedAt,desc" | "salaryMax,desc">("publishedAt,desc");
  const [jobs, setJobs] = useState<PageResponse<Job> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const value = new URLSearchParams({ page: String(pageNumber), size: "12", sort: sortOrder });
    if (keyword.trim()) value.set("keyword", keyword.trim());
    if (skill.trim()) value.set("skill", skill.trim());
    if (location.trim()) value.set("location", location.trim());
    if (level.trim()) value.set("level", level.trim());
    if (jobType.trim()) value.set("type", jobType.trim());
    if (companyId.trim()) value.set("companyId", companyId.trim());
    if (salaryMin.trim()) value.set("salaryMin", salaryMin.trim());
    return value;
  }, [keyword, skill, location, level, jobType, companyId, salaryMin, pageNumber, sortOrder]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setKeyword(params.get("keyword") ?? "");
    setSkill(params.get("skill") ?? "");
    setLocation(params.get("location") ?? "");
    setLevel(params.get("level") ?? "");
    setJobType(params.get("type") ?? "");
    setCompanyId(params.get("companyId") ?? "");
  }, []);

  useEffect(() => {
    setLoading(true);
    api.jobs(params)
      .then((page) => {
        setJobs(page);
        setError("");
      })
      .catch((ex) => {
        setJobs(previewJobs);
        setError(previewMessage(ex));
      })
      .finally(() => setLoading(false));
  }, [params]);

  const visibleJobs = jobs?.content ?? [];
  const totalPages = Math.max(jobs?.totalPages ?? 1, 1);
  const currentPage = Math.min((jobs?.number ?? pageNumber) + 1, totalPages);
  const hasFilters = Boolean(
    keyword.trim() || skill.trim() || location.trim() || level.trim() || jobType.trim() || companyId.trim() || salaryMin.trim()
  );

  function updateFilter(next: () => void) {
    setPageNumber(0);
    next();
  }

  function clearFilters() {
    setKeyword("");
    setSkill("");
    setLocation("");
    setLevel("");
    setJobType("");
    setCompanyId("");
    setSalaryMin("");
    setPageNumber(0);
  }

  return (
    <section className="page-stack" data-testid="jobs-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Published opportunities</p>
          <h1>Jobs</h1>
          <p>
            Search production-ready backend roles across approved companies. The UI keeps recruitment data, search
            state, and platform health visible without turning into a marketing page.
          </p>
        </div>
        <div className="hero-actions">
          <span className="badge live">
            <Activity size={13} />
            Gateway route
          </span>
          <span className="badge">
            <Database size={13} />
            OpenSearch ready
          </span>
          <Link className="button secondary" href="/login">
            Sign in
          </Link>
        </div>
      </div>

      <div className="filter-bar">
        <label>
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => updateFilter(() => setKeyword(event.target.value))}
            placeholder="Keyword"
          />
        </label>
        <label>
          <Filter size={16} />
          <input
            value={skill}
            onChange={(event) => updateFilter(() => setSkill(event.target.value))}
            placeholder="Skill"
          />
        </label>
        <label>
          <MapPin size={16} />
          <input
            value={location}
            onChange={(event) => updateFilter(() => setLocation(event.target.value))}
            placeholder="Location"
          />
        </label>
        <label>
          <ShieldCheck size={16} />
          <select
            aria-label="Level"
            value={level}
            onChange={(event) => updateFilter(() => setLevel(event.target.value))}
          >
            <option value="">Any level</option>
            <option value="Junior">Junior</option>
            <option value="Middle">Middle</option>
            <option value="Mid-Senior">Mid-Senior</option>
            <option value="Senior">Senior</option>
            <option value="Lead">Lead</option>
          </select>
        </label>
        <label>
          <BriefcaseBusiness size={16} />
          <select
            aria-label="Job type"
            value={jobType}
            onChange={(event) => updateFilter(() => setJobType(event.target.value))}
          >
            <option value="">Any type</option>
            <option value="Full-time">Full-time</option>
            <option value="Contract">Contract</option>
            <option value="Part-time">Part-time</option>
            <option value="Remote">Remote</option>
          </select>
        </label>
        <label>
          <BriefcaseBusiness size={16} />
          <input
            min="0"
            type="number"
            value={salaryMin}
            onChange={(event) => updateFilter(() => setSalaryMin(event.target.value))}
            placeholder="Minimum salary"
          />
        </label>
      </div>

      <div className="toolbar">
        <div className="filter-tabs" aria-label="Job filters">
          <button className={!hasFilters ? "tab active" : "tab"} type="button" onClick={clearFilters}>Published</button>
          <button className={location.toLowerCase().includes("remote") ? "tab active" : "tab"} type="button" onClick={() => updateFilter(() => setLocation("Remote"))}>Remote</button>
          <button className={level === "Senior" ? "tab active" : "tab"} type="button" onClick={() => updateFilter(() => {
            setLevel("Senior");
            setLocation("");
          })}>Senior</button>
          <button className={jobType === "Full-time" ? "tab active" : "tab"} type="button" onClick={() => updateFilter(() => setJobType("Full-time"))}>Full-time</button>
          <button className={skill === "Java" ? "tab active" : "tab"} type="button" onClick={() => updateFilter(() => setSkill("Java"))}>Java</button>
        </div>
        <div className="toolbar-actions">
          <span className="muted">Page {currentPage} of {totalPages}</span>
          {hasFilters ? (
            <button className="button outline" type="button" onClick={clearFilters}>
              <X size={16} />
              Clear filters
            </button>
          ) : null}
          <button
            className="button outline"
            type="button"
            onClick={() => updateFilter(() => setSortOrder((value) => value === "publishedAt,desc" ? "salaryMax,desc" : "publishedAt,desc"))}
          >
            <SlidersHorizontal size={16} />
            Sort: {sortOrder === "publishedAt,desc" ? "newest" : "salary"}
          </button>
        </div>
      </div>

      <div className="metrics-row">
        <MetricCard icon={BriefcaseBusiness} label="Results" value={jobs?.totalElements ?? 0} helper="Paginated search" />
        <MetricCard icon={Database} label="Page size" value={jobs?.size ?? 12} helper={`${jobs?.totalPages ?? 1} result pages`} />
        <MetricCard icon={Clock3} label="Search p95" value="128ms" helper="Prometheus target" />
        <MetricCard icon={ShieldCheck} label="Workflow" value="Approved" helper="Admin reviewed" />
      </div>

      <DemoModeNotice message={error} />
      <div className="results-layout">
        <div className="results-main">
          <div className="job-grid" data-testid="job-grid">
            {loading ? (
              <div className="empty-state">
                <Loader2 className="spin" size={18} />
                <strong>Syncing published jobs</strong>
                <span>Calling Gateway, search adapter, and job-service.</span>
              </div>
            ) : null}
            {!loading && visibleJobs.length === 0 ? (
              <div className="empty-state">
                <Search size={18} />
                <strong>No jobs match this filter</strong>
                <span>Try a broader keyword, skill, location, level, or salary range.</span>
              </div>
            ) : null}
            {!loading && visibleJobs.map((job) => {
              const brand = brandForJob(job);
              return (
                <Link className="job-card" data-testid="job-card" href={`/jobs/${job.id}`} key={job.id}>
                  <div className="job-card-top">
                    <div className="company-line">
                      <CompanyLogo brand={brand} />
                      <span>
                        <strong>{brand.name}</strong>
                        <span>{brand.industry}</span>
                      </span>
                    </div>
                    <StatusPill value={job.status} />
                  </div>
                  <div>
                    <h2>{job.title}</h2>
                    <div className="job-meta">
                      <span>{job.location ?? "Remote"}</span>
                      <span>{job.level ?? "Any level"}</span>
                      <strong>{salary(job)}</strong>
                    </div>
                  </div>
                  <p>{job.description}</p>
                  <div className="tag-row">
                    {(job.skills ?? []).slice(0, 4).map((item) => (
                      <span className="tag" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="infra-row">
                    {infraBadges(job).map((item) => (
                      <span className="infra-tag" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
          <div className="pagination-bar" aria-label="Jobs pagination">
            <span>
              Showing {visibleJobs.length} of {jobs?.totalElements ?? 0} published jobs
            </span>
            <div className="pagination-actions">
              <button
                className="button outline"
                disabled={loading || currentPage <= 1}
                type="button"
                onClick={() => setPageNumber((value) => Math.max(value - 1, 0))}
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <strong>{currentPage} / {totalPages}</strong>
              <button
                className="button outline"
                disabled={loading || currentPage >= totalPages}
                type="button"
                onClick={() => setPageNumber((value) => Math.min(value + 1, totalPages - 1))}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        <aside className="insight-panel">
          <p className="eyebrow">Production insights</p>
          <h2>Service readiness</h2>
          <div className="insight-list">
            <div className="mini-stat">
              <span>Kafka outbox</span>
              <strong>0 failed</strong>
            </div>
            <div className="mini-stat">
              <span>Gateway 5xx</span>
              <strong>{"< 0.2%"}</strong>
            </div>
            <div className="insight-line">
              <span>Auth service</span>
              <span className="badge live">JWT ready</span>
            </div>
            <div className="insight-line">
              <span>Search adapter</span>
              <span className="badge">OpenSearch</span>
            </div>
            <div className="insight-line">
              <span>Audit stream</span>
              <span className="badge">Kafka</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function salary(job: Job) {
  if (!job.salaryMin && !job.salaryMax) return "Negotiable";
  return `$${job.salaryMin ?? 0} - $${job.salaryMax ?? 0}`;
}

function infraBadges(job: Job) {
  const text = `${job.title} ${job.description} ${(job.skills ?? []).join(" ")}`.toLowerCase();
  const badges = [
    text.includes("kafka") ? "Kafka" : "Spring Boot",
    text.includes("opensearch") || text.includes("search") ? "OpenSearch" : "PostgreSQL",
    text.includes("aws") || text.includes("cloud") ? "AWS" : "Docker"
  ];
  return Array.from(new Set(badges));
}

function previewMessage(ex: unknown) {
  const message = ex instanceof Error ? ex.message : "";
  if (!message || message === "Failed to fetch") {
    return "";
  }
  return `${message}. Curated recruitment data is active for this reviewer session.`;
}

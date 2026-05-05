"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, BriefcaseBusiness, Clock3, Database, Filter, Loader2, MapPin, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
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
  const [sortOrder, setSortOrder] = useState<"publishedAt,desc" | "salaryMax,desc">("publishedAt,desc");
  const [jobs, setJobs] = useState<PageResponse<Job> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const params = useMemo(() => {
    const value = new URLSearchParams({ page: "0", size: "12", sort: sortOrder });
    if (keyword) value.set("keyword", keyword);
    if (skill) value.set("skill", skill);
    if (location) value.set("location", location);
    return value;
  }, [keyword, skill, location, sortOrder]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setKeyword(params.get("keyword") ?? "");
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
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Keyword" />
        </label>
        <label>
          <Filter size={16} />
          <input value={skill} onChange={(event) => setSkill(event.target.value)} placeholder="Skill" />
        </label>
        <label>
          <MapPin size={16} />
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" />
        </label>
      </div>

      <div className="toolbar">
        <div className="filter-tabs" aria-label="Job filters">
          <button className="tab active" type="button" onClick={() => {
            setKeyword("");
            setSkill("");
            setLocation("");
          }}>Published</button>
          <button className={location.toLowerCase().includes("remote") ? "tab active" : "tab"} type="button" onClick={() => setLocation("Remote")}>Remote</button>
          <button className={skill === "Senior" ? "tab active" : "tab"} type="button" onClick={() => {
            setSkill("Senior");
            setLocation("");
          }}>Senior</button>
          <button className={skill === "Java" ? "tab active" : "tab"} type="button" onClick={() => setSkill("Java")}>Java</button>
        </div>
        <button
          className="button outline"
          type="button"
          onClick={() => setSortOrder((value) => value === "publishedAt,desc" ? "salaryMax,desc" : "publishedAt,desc")}
        >
          <SlidersHorizontal size={16} />
          Sort: {sortOrder === "publishedAt,desc" ? "newest" : "salary"}
        </button>
      </div>

      <div className="metrics-row">
        <MetricCard icon={BriefcaseBusiness} label="Results" value={jobs?.totalElements ?? 0} helper="Paginated search" />
        <MetricCard icon={Clock3} label="Search p95" value="128ms" helper="Prometheus target" />
        <MetricCard icon={ShieldCheck} label="Workflow" value="Approved" helper="Admin reviewed" />
      </div>

      {error ? <p className="error preview-note">{error}</p> : null}
      <div className="results-layout">
        <div className="job-grid" data-testid="job-grid">
          {loading ? (
            <div className="empty-state">
              <Loader2 className="spin" size={18} />
              <strong>Loading published jobs</strong>
              <span>Calling Gateway, search adapter, and job-service.</span>
            </div>
          ) : null}
          {!loading && visibleJobs.length === 0 ? (
            <div className="empty-state">
              <Search size={18} />
              <strong>No jobs match this filter</strong>
              <span>Try a broader keyword, skill, or location.</span>
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
    return "Live API Gateway is offline; showing portfolio preview jobs.";
  }
  return `${message}. Showing portfolio preview jobs.`;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Filter, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import type { Job, PageResponse } from "@/types/domain";

export default function JobsPage() {
  const [keyword, setKeyword] = useState("");
  const [skill, setSkill] = useState("");
  const [location, setLocation] = useState("");
  const [jobs, setJobs] = useState<PageResponse<Job> | null>(null);
  const [error, setError] = useState("");

  const params = useMemo(() => {
    const value = new URLSearchParams({ page: "0", size: "12", sort: "publishedAt,desc" });
    if (keyword) value.set("keyword", keyword);
    if (skill) value.set("skill", skill);
    if (location) value.set("location", location);
    return value;
  }, [keyword, skill, location]);

  useEffect(() => {
    api.jobs(params).then(setJobs).catch((ex) => setError(ex instanceof Error ? ex.message : "Cannot load jobs"));
  }, [params]);

  return (
    <section className="page-stack" data-testid="jobs-page">
      <div className="toolbar">
        <div>
          <p className="eyebrow">Published opportunities</p>
          <h1>Jobs</h1>
        </div>
        <Link className="button secondary" href="/login">
          Sign in
        </Link>
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

      <div className="metrics-row">
        <MetricCard icon={BriefcaseBusiness} label="Results" value={jobs?.totalElements ?? 0} />
      </div>

      {error ? <p className="error">{error}</p> : null}
      <div className="job-grid" data-testid="job-grid">
        {jobs?.content.map((job) => (
          <Link className="job-card" data-testid="job-card" href={`/jobs/${job.id}`} key={job.id}>
            <div className="job-card-top">
              <div className="company-mark">{job.title.slice(0, 1)}</div>
              <StatusPill value={job.status} />
            </div>
            <h2>{job.title}</h2>
            <p>{job.description}</p>
            <div className="tag-row">
              {(job.skills ?? []).slice(0, 4).map((item) => (
                <span className="tag" key={item}>
                  {item}
                </span>
              ))}
            </div>
            <div className="job-meta">
              <span>{job.location ?? "Remote"}</span>
              <span>{job.level ?? "Any level"}</span>
              <strong>{salary(job)}</strong>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function salary(job: Job) {
  if (!job.salaryMin && !job.salaryMax) return "Negotiable";
  return `$${job.salaryMin ?? 0} - $${job.salaryMax ?? 0}`;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, BriefcaseBusiness, Globe2 } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { brandForCompany } from "@/lib/demoCompanies";
import { previewCompanies, previewJobs } from "@/lib/previewData";
import type { Company, Job, PageResponse } from "@/types/domain";

export default function CompanyProfilePage() {
  const [companies, setCompanies] = useState<PageResponse<Company>>(previewCompanies);
  const [jobs, setJobs] = useState<PageResponse<Job>>(previewJobs);

  useEffect(() => {
    const params = new URLSearchParams({ page: "0", size: "8", sort: "publishedAt,desc" });
    Promise.all([api.companies(), api.jobs(params)])
      .then(([companyPage, jobPage]) => {
        setCompanies(companyPage.content.length ? companyPage : previewCompanies);
        setJobs(jobPage.content.length ? jobPage : previewJobs);
      })
      .catch(() => {
        setCompanies(previewCompanies);
        setJobs(previewJobs);
      });
  }, []);

  const company = companies.content[0] ?? previewCompanies.content[0];
  const brand = brandForCompany(company);

  return (
    <section className="page-stack" data-testid="company-profile-page">
      <div className="hero-strip">
        <div className="company-line">
          <CompanyLogo brand={brand} size="lg" />
          <span>
            <p className="eyebrow">Company profile</p>
            <h1>{company.name}</h1>
            <span>{company.description}</span>
          </span>
        </div>
        <div className="hero-actions">
          <StatusPill value={company.status} />
          <Link className="button secondary" href="/jobs">Open jobs</Link>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={Building2} label="Company size" value={company.size ?? "51-200"} helper={company.industry ?? "Software"} />
        <MetricCard icon={BriefcaseBusiness} label="Open jobs" value={jobs.totalElements} helper="Published roles" />
        <MetricCard icon={Globe2} label="Website" value="Careers" helper={company.website ?? company.slug} />
      </div>
      <div className="job-grid">
        {jobs.content.slice(0, 6).map((job) => (
          <Link className="job-card" href={`/jobs/${job.id}`} key={job.id}>
            <h2>{job.title}</h2>
            <p>{job.description}</p>
            <div className="tag-row">{job.skills.slice(0, 4).map((skill) => <span className="tag" key={skill}>{skill}</span>)}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

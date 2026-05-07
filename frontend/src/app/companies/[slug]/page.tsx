"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, BriefcaseBusiness, Globe2 } from "lucide-react";
import { useParams } from "next/navigation";
import { CompanyLogo } from "@/components/CompanyLogo";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { brandForCompany } from "@/lib/demoCompanies";
import { previewCompanies, previewJobs } from "@/lib/previewData";
import type { Company, Job, PageResponse } from "@/types/domain";

export default function CompanyProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [company, setCompany] = useState<Company>(() =>
    previewCompanies.content.find((item) => item.slug === slug) ?? previewCompanies.content[0]
  );
  const [jobs, setJobs] = useState<PageResponse<Job>>(() => scopedPreviewJobs(company));

  useEffect(() => {
    const requestedSlug = slug;
    api.companyBySlug(requestedSlug)
      .then((companyProfile) => {
        setCompany(companyProfile);
        const jobParams = new URLSearchParams({
          page: "0",
          size: "8",
          sort: "publishedAt,desc",
          companyId: companyProfile.id
        });
        return api.jobs(jobParams).then((jobPage) => ({ companyProfile, jobPage }));
      })
      .then(({ companyProfile, jobPage }) => {
        setJobs(jobPage);
      })
      .catch(() => {
        const fallbackCompany = previewCompanies.content.find((item) => item.slug === requestedSlug) ?? previewCompanies.content[0];
        setCompany(fallbackCompany);
        setJobs(scopedPreviewJobs(fallbackCompany));
      });
  }, [slug]);

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
          <Link className="button secondary" href={`/jobs?companyId=${encodeURIComponent(company.id)}`}>Open jobs</Link>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={Building2} label="Company size" value={company.size ?? "51-200"} helper={company.industry ?? "Software"} />
        <MetricCard icon={BriefcaseBusiness} label="Open jobs" value={jobs.totalElements} helper="Slug-backed profile" />
        <MetricCard icon={Globe2} label="Website" value="Careers" helper={company.website ?? company.slug} />
      </div>
      <div className="job-grid">
        {jobs.content.length === 0 ? (
          <div className="empty-state">
            <BriefcaseBusiness size={18} />
            <strong>No published roles right now</strong>
            <span>This approved company profile is ready for new jobs after employer submission and admin review.</span>
          </div>
        ) : null}
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

function scopedPreviewJobs(company: Company): PageResponse<Job> {
  const jobs = previewJobs.content.slice(0, 6).map((job) => ({ ...job, companyId: company.id }));
  return {
    ...previewJobs,
    content: jobs,
    totalElements: jobs.length,
    totalPages: 1,
    size: jobs.length
  };
}

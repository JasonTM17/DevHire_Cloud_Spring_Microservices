"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Clock } from "lucide-react";
import { SkillTag } from "./ui/SkillTag";
import { formatSalaryRange } from "@/lib/salaryFormat";
import type { Job } from "@/types/domain";

type JobCardProps = {
  job: Job;
  companyName?: string;
  companyLogoUrl?: string;
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "1 ngày trước";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  return `${Math.floor(diffDays / 30)} tháng trước`;
}

function getCompanyInitial(name?: string): string {
  return name ? name.charAt(0).toUpperCase() : "C";
}

export function JobCard({ job, companyName, companyLogoUrl }: JobCardProps) {
  const visibleSkills = job.skills.slice(0, 5);
  const postedDate = job.publishedAt || job.createdAt;

  return (
    <div className="card job-card">
      <div className="job-card__logo">
        {companyLogoUrl ? (
          <Image src={companyLogoUrl} alt={companyName || "Company"} width={48} height={48} unoptimized />
        ) : (
          <span className="job-card__logo-fallback">
            {getCompanyInitial(companyName)}
          </span>
        )}
      </div>

      <div className="job-card__content">
        <Link href={`/jobs/${job.id}`} className="job-card__title">
          {job.title}
        </Link>
        <span className="job-card__company">{companyName || "Công ty"}</span>
        <div className="job-card__tags">
          {visibleSkills.map((skill) => (
            <SkillTag key={skill} skill={skill} />
          ))}
        </div>
        <div className="job-card__meta">
          {job.location && (
            <span className="job-card__location">
              <MapPin size={14} />
              {job.location}
            </span>
          )}
          <span className="job-card__date">
            <Clock size={14} />
            {formatRelativeDate(postedDate)}
          </span>
        </div>
      </div>

      <div className="job-card__salary">
        {formatSalaryRange(job.salaryMin, job.salaryMax)}
      </div>
    </div>
  );
}

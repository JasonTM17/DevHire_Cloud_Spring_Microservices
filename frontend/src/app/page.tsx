"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { SearchBar } from "@/components/ui/SearchBar";
import { SkillTag } from "@/components/ui/SkillTag";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { JobCard } from "@/components/JobCard";
import type { Job, Company, PageResponse } from "@/types/domain";

const TRENDING_SKILLS = ["Java", "ReactJS", ".NET", "NodeJS", "Python", "TypeScript", "PHP", "Tester"];

const CITIES = [
  { value: "", label: "Tất cả thành phố" },
  { value: "Ho Chi Minh", label: "Hồ Chí Minh" },
  { value: "Ha Noi", label: "Hà Nội" },
  { value: "Da Nang", label: "Đà Nẵng" },
  { value: "Remote", label: "Remote" },
];

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState("");
  const [totalJobs, setTotalJobs] = useState(0);
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const jobsResponse = await api.jobs(new URLSearchParams({ size: "6", sort: "publishedAt,desc" }));
        setFeaturedJobs(jobsResponse.content);
        setTotalJobs(jobsResponse.totalElements);
      } catch {
        // Silently handle — homepage still renders
      }

      try {
        const companiesResponse = await api.companies();
        const approved = companiesResponse.content
          .filter((c) => c.status === "APPROVED")
          .slice(0, 6);
        setCompanies(approved);
      } catch {
        // Silently handle
      }
    }

    fetchData();
  }, []);

  function handleSearch() {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (city) params.set("city", city);
    router.push(`/jobs?${params.toString()}`);
  }

  function handleSkillClick(skill: string) {
    router.push(`/jobs?skill=${encodeURIComponent(skill)}`);
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-section__heading">
          <span>{totalJobs}</span> IT Jobs For <span>Chất</span> Developers
        </h1>
        <div className="hero-section__search">
          <SearchBar
            placeholder="Tìm kiếm việc làm IT theo skill, vị trí..."
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
          />
          <select
            className="hero-section__city-select"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            aria-label="Chọn thành phố"
          >
            {CITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Trending Skills */}
      <section className="trending-section">
        <span className="trending-section__label">Trending:</span>
        {TRENDING_SKILLS.map((skill) => (
          <SkillTag key={skill} skill={skill} onClick={handleSkillClick} />
        ))}
      </section>

      {/* Top Employers */}
      {companies.length > 0 && (
        <section className="top-employers">
          <SectionHeader title="Nhà tuyển dụng hàng đầu" linkText="Xem tất cả" linkHref="/companies" />
          <div className="top-employers__grid">
            {companies.map((company) => (
              <div
                key={company.id}
                className="card employer-card"
                onClick={() => router.push(`/companies/${company.slug}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && router.push(`/companies/${company.slug}`)}
              >
                <div className="employer-card__logo">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} />
                  ) : (
                    <span className="employer-card__logo-fallback">
                      {company.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="employer-card__name">{company.name}</span>
                {company.industry && (
                  <span className="employer-card__industry">{company.industry}</span>
                )}
                <span className="employer-card__jobs">Đang tuyển dụng</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Jobs */}
      {featuredJobs.length > 0 && (
        <section className="featured-jobs">
          <SectionHeader title="Việc làm nổi bật" linkText="Xem tất cả" linkHref="/jobs" />
          <div className="featured-jobs__grid">
            {featuredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

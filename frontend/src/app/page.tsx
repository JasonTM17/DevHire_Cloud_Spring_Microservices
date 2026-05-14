"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Building2, MapPin, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { SearchBar } from "@/components/ui/SearchBar";
import { SkillTag } from "@/components/ui/SkillTag";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { JobCard } from "@/components/JobCard";
import type { Company, Job } from "@/types/domain";

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
        setFeaturedJobs([]);
      }

      try {
        const companiesResponse = await api.companies();
        const approved = companiesResponse.content
          .filter((company) => company.status === "APPROVED")
          .slice(0, 6);
        setCompanies(approved);
      } catch {
        setCompanies([]);
      }
    }

    fetchData();
  }, []);

  const companyById = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  function handleSearch() {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (city) params.set("city", city);
    const query = params.toString();
    router.push(query ? `/jobs?${query}` : "/jobs");
  }

  function handleSkillClick(skill: string) {
    router.push(`/jobs?skill=${encodeURIComponent(skill)}`);
  }

  return (
    <div className="client-home">
      <section className="hero-section">
        <div className="hero-section__content">
          <p className="hero-section__eyebrow">DevHire IT Jobs</p>
          <h1 className="hero-section__heading">
            Tìm việc IT chất lượng cho developer nghiêm túc
          </h1>
          <p className="hero-section__subtitle">
            Khám phá cơ hội backend, cloud, data và frontend từ các công ty công nghệ đang tuyển thật.
          </p>
          <div className="hero-section__search">
            <SearchBar
              placeholder="Nhập kỹ năng, vị trí hoặc tên công ty"
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
              {CITIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="hero-section__trust-row" aria-label="Nền tảng tuyển dụng IT">
            <span><ShieldCheck size={16} /> Code assessment server-side</span>
            <span><Building2 size={16} /> {companies.length || 6}+ công ty nổi bật</span>
            <span><MapPin size={16} /> Remote, Hà Nội, Hồ Chí Minh</span>
          </div>
        </div>
      </section>

      <section className="trending-section">
        <span className="trending-section__label">Kỹ năng nổi bật:</span>
        {TRENDING_SKILLS.map((skill) => (
          <SkillTag key={skill} skill={skill} onClick={handleSkillClick} />
        ))}
      </section>

      {companies.length > 0 && (
        <section className="top-employers">
          <SectionHeader title="Nhà tuyển dụng nổi bật" linkText="Xem tất cả" linkHref="/companies" />
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
                    <Image src={company.logoUrl} alt={company.name} width={64} height={64} unoptimized />
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

      {featuredJobs.length > 0 && (
        <section className="featured-jobs">
          <SectionHeader title="Việc làm nổi bật" linkText="Xem tất cả" linkHref="/jobs" />
          <div className="featured-jobs__grid">
            {featuredJobs.map((job) => {
              const company = companyById.get(job.companyId);
              return (
                <JobCard
                  key={job.id}
                  job={job}
                  companyName={company?.name}
                  companyLogoUrl={company?.logoUrl}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

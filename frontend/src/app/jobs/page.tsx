"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { FilterSidebar, type FilterGroup, type FilterState } from "@/components/FilterSidebar";
import { SearchBar } from "@/components/ui/SearchBar";
import { api } from "@/lib/api";
import { previewCompanies, previewJobs } from "@/lib/previewData";
import type { Company, Job } from "@/types/domain";

const PAGE_SIZE = 20;

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: "skills",
    title: "Kỹ năng",
    type: "checkbox",
    options: [
      { label: "Java", value: "Java" },
      { label: "ReactJS", value: "ReactJS" },
      { label: "Python", value: "Python" },
      { label: "NodeJS", value: "NodeJS" },
      { label: ".NET", value: ".NET" },
      { label: "TypeScript", value: "TypeScript" },
      { label: "PHP", value: "PHP" },
      { label: "Go", value: "Go" },
      { label: "AWS", value: "AWS" },
      { label: "Docker", value: "Docker" },
    ],
  },
  {
    id: "salary",
    title: "Salary (USD/month)",
    type: "range",
    min: 0,
    max: 12000,
    step: 500,
  },
  {
    id: "level",
    title: "Cấp bậc",
    type: "radio",
    options: [
      { label: "Junior", value: "Junior" },
      { label: "Mid", value: "Mid" },
      { label: "Senior", value: "Senior" },
      { label: "Lead", value: "Lead" },
    ],
  },
  {
    id: "type",
    title: "Loại hình",
    type: "radio",
    options: [
      { label: "Full-time", value: "Full-time" },
      { label: "Part-time", value: "Part-time" },
      { label: "Contract", value: "Contract" },
      { label: "Remote", value: "Remote" },
    ],
  },
  {
    id: "location",
    title: "Địa điểm",
    type: "select",
    options: [
      { label: "Ho Chi Minh", value: "Ho Chi Minh" },
      { label: "Ha Noi", value: "Ha Noi" },
      { label: "Da Nang", value: "Da Nang" },
      { label: "Remote", value: "Remote" },
    ],
  },
];

function buildSearchParams(filters: FilterState, page: number, keyword: string): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(PAGE_SIZE));
  params.set("sort", "publishedAt,desc");

  const trimmedKeyword = keyword.trim();
  if (trimmedKeyword) params.set("search", trimmedKeyword);

  const skills = filters.skills as string[] | undefined;
  if (skills && skills.length > 0) {
    params.set("skill", skills.join(","));
  }

  const salary = filters.salary as [number, number] | undefined;
  if (salary) {
    if (salary[0] > 0) params.set("salaryMin", String(salary[0]));
    if (salary[1] > 0 && salary[1] < 12000) params.set("salaryMax", String(salary[1]));
  }

  const level = filters.level as string | undefined;
  if (level) params.set("level", level);

  const type = filters.type as string | undefined;
  if (type) params.set("type", type);

  const location = filters.location as string | undefined;
  if (location) params.set("location", location);

  return params;
}

function getInitialFilters(searchParams: { get(name: string): string | null }): FilterState {
  const state: FilterState = {};

  const skill = searchParams.get("skill");
  if (skill) {
    state.skills = skill.split(",").filter(Boolean);
  }

  const level = searchParams.get("level");
  if (level) state.level = level;

  const type = searchParams.get("type");
  if (type) state.type = type;

  const location = searchParams.get("location") || searchParams.get("city");
  if (location) state.location = location;

  const salaryMin = searchParams.get("salaryMin");
  const salaryMax = searchParams.get("salaryMax");
  if (salaryMin || salaryMax) {
    state.salary = [
      salaryMin ? Number(salaryMin) : 0,
      salaryMax ? Number(salaryMax) : 12000,
    ];
  }

  return state;
}

function getActiveFilterCount(filters: FilterState): number {
  return Object.values(filters).reduce((count, value) => {
    if (Array.isArray(value)) {
      return count + (value.length > 0 ? 1 : 0);
    }
    return count + (value ? 1 : 0);
  }, 0);
}

function approvedPreviewCompanies() {
  return previewCompanies.content.filter((company) => company.status === "APPROVED");
}

function filterPreviewJobs(filters: FilterState, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const skills = filters.skills as string[] | undefined;
  const salary = filters.salary as [number, number] | undefined;
  const level = filters.level as string | undefined;
  const type = filters.type as string | undefined;
  const location = filters.location as string | undefined;

  return previewJobs.content.filter((job) => {
    const searchable = [
      job.title,
      job.description,
      job.requirements,
      job.benefits,
      job.location,
      job.level,
      job.type,
      ...job.skills,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (normalizedKeyword && !searchable.includes(normalizedKeyword)) {
      return false;
    }
    if (skills?.length && !skills.every((skill) => job.skills.includes(skill))) {
      return false;
    }
    if (salary) {
      const [min, max] = salary;
      if ((job.salaryMax ?? 0) < min || (job.salaryMin ?? 0) > max) {
        return false;
      }
    }
    if (level && job.level !== level) {
      return false;
    }
    if (type && job.type !== type) {
      return false;
    }
    if (location && !job.location?.toLowerCase().includes(location.toLowerCase())) {
      return false;
    }
    return true;
  });
}

export default function JobsPage() {
  return (
    <Suspense
      fallback={
        <div className="job-listing__loading">
          <Loader2 size={20} className="job-listing__spinner" />
          <span>Đang tải...</span>
        </div>
      }
    >
      <JobListingContent />
    </Suspense>
  );
}

function JobListingContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => getInitialFilters(searchParams));
  const [keyword, setKeyword] = useState(() => searchParams.get("search") ?? "");
  const [jobs, setJobs] = useState<Job[]>(() => filterPreviewJobs(getInitialFilters(searchParams), searchParams.get("search") ?? ""));
  const [companies, setCompanies] = useState<Company[]>(approvedPreviewCompanies);
  const [totalElements, setTotalElements] = useState(() => filterPreviewJobs(getInitialFilters(searchParams), searchParams.get("search") ?? "").length);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  const companyById = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const activeFilterCount = getActiveFilterCount(filters);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const response = await api.companies();
        setCompanies(response.content.filter((company) => company.status === "APPROVED"));
      } catch {
        setCompanies(approvedPreviewCompanies());
      }
    }

    fetchCompanies();
  }, []);

  const fetchJobs = useCallback(
    async (currentPage: number, append: boolean) => {
      const isLoadMore = append;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError("");

      try {
        const params = buildSearchParams(filters, currentPage, keyword);
        const response = await api.jobs(params);
        const newJobs = response.content ?? [];

        if (append) {
          setJobs((prev) => [...prev, ...newJobs]);
        } else {
          setJobs(newJobs);
        }

        setTotalElements(response.totalElements ?? 0);
        setHasMore(currentPage < (response.totalPages ?? 1) - 1);
      } catch {
        if (!append) {
          const previewMatches = filterPreviewJobs(filters, keyword);
          setJobs(previewMatches.slice(0, PAGE_SIZE));
          setTotalElements(previewMatches.length);
          setError("");
        }
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters, keyword]
  );

  useEffect(() => {
    setPage(0);
    fetchJobs(0, false);
  }, [fetchJobs]);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobs(nextPage, true);
  };

  return (
    <div className="job-listing" data-testid="jobs-page">
      <div className="job-listing__sidebar">
        <FilterSidebar
          filters={FILTER_GROUPS}
          value={filters}
          onChange={handleFilterChange}
        />
      </div>

      <div className="job-listing__results">
        <section className="job-listing__hero" aria-label="Tìm kiếm việc làm IT">
          <p className="job-listing__eyebrow">IT jobs marketplace</p>
          <h1>Tìm việc IT phù hợp với kỹ năng của bạn</h1>
          <p>
            Lọc nhanh theo stack, mức lương, cấp bậc và địa điểm. Kết quả ưu tiên tin tuyển dụng đã xuất bản.
          </p>
          <SearchBar
            placeholder="Tìm Java, ReactJS, Cloud, Backend..."
            value={keyword}
            onChange={setKeyword}
            onSearch={() => fetchJobs(0, false)}
          />
        </section>

        <div className="job-listing__header">
          <span className="job-listing__count">
            Tìm thấy {totalElements} việc làm
          </span>
          {activeFilterCount > 0 && (
            <button className="job-listing__clear-inline" type="button" onClick={handleClearFilters}>
              Xóa {activeFilterCount} bộ lọc
            </button>
          )}
        </div>

        {error && jobs.length === 0 && <div className="job-listing__error">{error}</div>}

        {loading && (
          <div className="job-listing__loading">
            <Loader2 size={20} className="job-listing__spinner" />
            <span>Đang tải...</span>
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="job-listing__empty">
            <div className="job-listing__empty-icon" aria-hidden="true">⌕</div>
            <p className="job-listing__empty-text">
              Không tìm thấy việc làm phù hợp
            </p>
            <button
              className="job-listing__empty-btn"
              type="button"
              onClick={handleClearFilters}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}

        {!loading && jobs.length > 0 && (
          <div className="job-listing__grid" data-testid="job-grid">
            {jobs.map((job) => {
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
        )}

        {!loading && hasMore && (
          <div className="job-listing__load-more">
            <button
              className="job-listing__load-more-btn"
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 size={16} className="job-listing__spinner" />
                  Đang tải...
                </>
              ) : (
                "Tải thêm"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

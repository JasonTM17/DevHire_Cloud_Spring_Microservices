"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { FilterSidebar, type FilterGroup, type FilterState } from "@/components/FilterSidebar";
import { api } from "@/lib/api";
import type { Job } from "@/types/domain";

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
    title: "Mức lương (triệu)",
    type: "range",
    min: 0,
    max: 100,
    step: 5,
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

function buildSearchParams(filters: FilterState, page: number): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(PAGE_SIZE));
  params.set("sort", "publishedAt,desc");

  const skills = filters.skills as string[] | undefined;
  if (skills && skills.length > 0) {
    params.set("skill", skills.join(","));
  }

  const salary = filters.salary as [number, number] | undefined;
  if (salary) {
    if (salary[0] > 0) params.set("salaryMin", String(salary[0]));
    if (salary[1] > 0 && salary[1] < 100) params.set("salaryMax", String(salary[1]));
  }

  const level = filters.level as string | undefined;
  if (level) params.set("level", level);

  const type = filters.type as string | undefined;
  if (type) params.set("type", type);

  const location = filters.location as string | undefined;
  if (location) params.set("location", location);

  return params;
}

function getInitialFilters(searchParams: URLSearchParams): FilterState {
  const state: FilterState = {};

  const skill = searchParams.get("skill");
  if (skill) {
    state.skills = skill.split(",").filter(Boolean);
  }

  const level = searchParams.get("level");
  if (level) state.level = level;

  const type = searchParams.get("type");
  if (type) state.type = type;

  const location = searchParams.get("location");
  if (location) state.location = location;

  const salaryMin = searchParams.get("salaryMin");
  const salaryMax = searchParams.get("salaryMax");
  if (salaryMin || salaryMax) {
    state.salary = [
      salaryMin ? Number(salaryMin) : 0,
      salaryMax ? Number(salaryMax) : 100,
    ];
  }

  return state;
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchJobs = useCallback(
    async (currentPage: number, append: boolean) => {
      const isLoadMore = append;
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = buildSearchParams(filters, currentPage);
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
          setJobs([]);
          setTotalElements(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters]
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
        <div className="job-listing__header">
          <span className="job-listing__count">
            Tìm thấy {totalElements} việc làm
          </span>
        </div>

        {loading && (
          <div className="job-listing__loading">
            <Loader2 size={20} className="job-listing__spinner" />
            <span>Đang tải...</span>
          </div>
        )}

        {!loading && jobs.length === 0 && (
          <div className="job-listing__empty">
            <div className="job-listing__empty-icon">🔍</div>
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

        {!loading &&
          jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}

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

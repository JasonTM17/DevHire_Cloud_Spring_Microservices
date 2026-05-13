"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { filterChallenges, type ChallengeFilter } from "@/lib/challenges/filter";
import type { PublicChallenge } from "@/types/domain";
import { FilterSidebar } from "@/components/challenges/FilterSidebar";
import { SearchInput } from "@/components/challenges/SearchInput";
import { ProgressSummaryPanel } from "@/components/challenges/ProgressSummaryPanel";
import { ChallengeGrid } from "@/components/challenges/ChallengeGrid";
import { SkeletonLoader } from "@/components/ui/primitives/SkeletonLoader";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { ErrorState } from "@/components/ui/feedback/ErrorState";

// --- Types ---

interface ChallengesApiResponse {
  challenges: PublicChallenge[];
  availableLanguages: string[];
  availableTopics: string[];
}

// --- Filter Toggle Button (mobile) ---

interface FilterToggleButtonProps {
  isOpen: boolean;
  activeFilterCount: number;
  onClick: () => void;
}

function FilterToggleButton({ isOpen, activeFilterCount, onClick }: FilterToggleButtonProps) {
  return (
    <button
      type="button"
      className="dh-challenges__filter-toggle"
      onClick={onClick}
      aria-expanded={isOpen}
      aria-controls="challenges-sidebar"
      aria-label={`${isOpen ? "Hide" : "Show"} filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M2.25 4.5h13.5M4.5 9h9M6.75 13.5h4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>Filters</span>
      {activeFilterCount > 0 && (
        <span className="dh-challenges__filter-badge" aria-hidden="true">
          {activeFilterCount}
        </span>
      )}
    </button>
  );
}

// --- Skeleton Loading Component ---

function ChallengePageSkeleton() {
  return (
    <div className="dh-challenges" aria-label="Loading challenges">
      <aside className="dh-challenges__sidebar">
        <SkeletonLoader shape="rect" width="100%" height="2rem" aria-label="Loading filters" />
        <SkeletonLoader shape="rect" width="100%" height="8rem" />
        <SkeletonLoader shape="rect" width="100%" height="8rem" />
        <SkeletonLoader shape="rect" width="100%" height="6rem" />
      </aside>
      <main className="dh-challenges__main">
        <SkeletonLoader shape="rect" width="100%" height="2.5rem" aria-label="Loading search" />
        <div className="dh-challenges__grid-skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonLoader key={i} shape="rect" width="100%" height="10rem" />
          ))}
        </div>
      </main>
    </div>
  );
}

// --- Utility: count active filters ---

function countActiveFilters(filters: ChallengeFilter): number {
  let count = 0;
  if (filters.difficulty) count++;
  if (filters.language) count++;
  if (filters.topic) count++;
  if (filters.solved !== undefined) count++;
  return count;
}

// --- Main Page Component ---

/**
 * ChallengeLibraryPage — Wires all challenge library components together.
 *
 * Layout: FilterSidebar on the left (collapsible on mobile), ChallengeGrid in the main area,
 * ProgressSummaryPanel in the sidebar.
 *
 * - Fetches public challenges via useDataFetcher
 * - Maintains filter state with useState<ChallengeFilter>
 * - Applies filterChallenges via useMemo for instant filtering (< 100ms)
 * - Renders responsive layout: sidebar (FilterSidebar + ProgressSummaryPanel) + main (SearchInput + ChallengeGrid)
 * - Sidebar collapses to a filter button on mobile (< 768px)
 * - Shows SkeletonLoader during initial load
 * - Shows EmptyState when filtered results are empty
 * - Shows ErrorState with retry on fetch failure
 * - Navigates to /candidate/assessments/{id} on challenge select
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.3, 11.1, 11.2
 */
export default function ChallengeLibraryPage() {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 767px)");

  // --- Mobile sidebar toggle ---
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // --- Data Fetching ---
  const { data, error, isValidating, mutate } = useDataFetcher<ChallengesApiResponse>(
    "/api/challenges",
    () =>
      fetch("/api/challenges").then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch challenges: ${res.status}`);
        return res.json();
      })
  );

  // --- Filter State ---
  const [filters, setFilters] = useState<ChallengeFilter>({});
  const [searchQuery, setSearchQuery] = useState("");

  // --- Filtered Challenges (instant via useMemo) ---
  const challenges = data?.challenges ?? [];

  const filteredChallenges = useMemo(() => {
    let result = filterChallenges(challenges, filters);

    // Apply search query filter on top
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.topics.some((t) => t.toLowerCase().includes(query)) ||
          c.languages.some((l) => l.toLowerCase().includes(query))
      );
    }

    return result;
  }, [challenges, filters, searchQuery]);

  // --- Handlers ---
  const handleFilterChange = useCallback((newFilters: ChallengeFilter) => {
    setFilters(newFilters);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSelectChallenge = useCallback(
    (id: string) => {
      router.push(`/candidate/assessments/${id}`);
    },
    [router]
  );

  const handleRetry = useCallback(() => {
    mutate();
  }, [mutate]);

  // --- Active filter count for badge ---
  const activeFilterCount = countActiveFilters(filters);

  // --- Error State ---
  if (error && !data) {
    return (
      <div className="dh-challenges dh-challenges--centered">
        <ErrorState
          variant="network"
          onRetry={handleRetry}
          data-testid="challenges-error"
        />
      </div>
    );
  }

  // --- Loading State ---
  if (!data && isValidating) {
    return <ChallengePageSkeleton />;
  }

  // --- Available filter options from API ---
  const availableLanguages = data?.availableLanguages ?? [];
  const availableTopics = data?.availableTopics ?? [];

  // --- Determine sidebar visibility ---
  const showSidebar = !isMobile || sidebarOpen;

  // --- Render ---
  return (
    <div className="dh-challenges">
      {/* Mobile filter toggle button */}
      {isMobile && (
        <FilterToggleButton
          isOpen={sidebarOpen}
          activeFilterCount={activeFilterCount}
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar: Filters + Progress */}
      {showSidebar && (
        <aside
          id="challenges-sidebar"
          className={`dh-challenges__sidebar${isMobile ? " dh-challenges__sidebar--mobile-open" : ""}`}
        >
          <FilterSidebar
            filters={filters}
            onChange={handleFilterChange}
            availableLanguages={availableLanguages}
            availableTopics={availableTopics}
          />
          <ProgressSummaryPanel
            className="dh-challenges__progress"
            data-testid="challenges-progress"
          />
        </aside>
      )}

      {/* Main Content: Search + Grid */}
      <main className="dh-challenges__main">
        <div className="dh-challenges__toolbar">
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search challenges..."
          />
          <span className="dh-challenges__count" aria-live="polite">
            {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? "s" : ""}
          </span>
        </div>

        {filteredChallenges.length > 0 ? (
          <ChallengeGrid
            challenges={filteredChallenges}
            onSelectChallenge={handleSelectChallenge}
          />
        ) : (
          <EmptyState
            illustration="no-results"
            title="No challenges found"
            description="Try adjusting your filters or search query."
            data-testid="challenges-empty"
          />
        )}
      </main>
    </div>
  );
}

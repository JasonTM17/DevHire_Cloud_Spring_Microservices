"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDataFetcher } from "@/hooks/useDataFetcher";
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

// --- Main Page Component ---

/**
 * ChallengeLibraryPage — Wires all challenge library components together.
 *
 * - Fetches public challenges via useDataFetcher
 * - Maintains filter state with useState<ChallengeFilter>
 * - Applies filterChallenges via useMemo for instant filtering (< 100ms)
 * - Renders responsive layout: sidebar (FilterSidebar + ProgressSummaryPanel) + main (SearchInput + ChallengeGrid)
 * - Shows SkeletonLoader during initial load
 * - Shows EmptyState when filtered results are empty
 * - Shows ErrorState with retry on fetch failure
 * - Navigates to /candidate/assessments/{id} on challenge select
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.3, 11.1, 11.2
 */
export default function ChallengeLibraryPage() {
  const router = useRouter();

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

  // --- Render ---
  return (
    <div className="dh-challenges">
      {/* Sidebar: Filters + Progress */}
      <aside className="dh-challenges__sidebar">
        <FilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          availableLanguages={availableLanguages}
          availableTopics={availableTopics}
        />
        <ProgressSummaryPanel
          className="dh-challenges__progress"
          data-testid="challenges-progress"
        />
      </aside>

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

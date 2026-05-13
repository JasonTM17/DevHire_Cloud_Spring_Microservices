"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { ChallengeCard } from "@/components/ChallengeCard";
import { FilterSidebar, type FilterGroup, type FilterState } from "@/components/FilterSidebar";
import type { PublicChallenge } from "@/types/domain";

const PREVIEW_CHALLENGES: PublicChallenge[] = [
  { id: "1", slug: "two-sum", title: "Two Sum", difficulty: "EASY", languages: ["Java", "TypeScript"], topics: ["Arrays", "Hash Map"], acceptanceRate: 78.5, totalSubmissions: 1240, solved: true },
  { id: "2", slug: "reverse-linked-list", title: "Reverse Linked List", difficulty: "EASY", languages: ["Java"], topics: ["Linked List"], acceptanceRate: 72.1, totalSubmissions: 890, solved: false },
  { id: "3", slug: "longest-substring", title: "Longest Substring Without Repeating Characters", difficulty: "MEDIUM", languages: ["Java", "TypeScript"], topics: ["Strings", "Sliding Window"], acceptanceRate: 45.3, totalSubmissions: 2100, solved: false },
  { id: "4", slug: "merge-intervals", title: "Merge Intervals", difficulty: "MEDIUM", languages: ["Java"], topics: ["Arrays", "Sorting"], acceptanceRate: 52.8, totalSubmissions: 1560, solved: true },
  { id: "5", slug: "binary-tree-level-order", title: "Binary Tree Level Order Traversal", difficulty: "MEDIUM", languages: ["Java", "TypeScript"], topics: ["Trees", "BFS"], acceptanceRate: 61.2, totalSubmissions: 980, solved: false },
  { id: "6", slug: "trapping-rain-water", title: "Trapping Rain Water", difficulty: "HARD", languages: ["Java"], topics: ["Arrays", "Dynamic Programming"], acceptanceRate: 28.7, totalSubmissions: 3200, solved: false },
  { id: "7", slug: "sql-employee-salary", title: "Employee Salary Report", difficulty: "EASY", languages: ["SQL"], topics: ["SQL", "Aggregation"], acceptanceRate: 82.1, totalSubmissions: 560, solved: false },
  { id: "8", slug: "system-design-cache", title: "Design a Cache System", difficulty: "HARD", languages: ["Java", "TypeScript"], topics: ["System Design"], acceptanceRate: 22.4, totalSubmissions: 450, solved: false },
];

const FILTER_CONFIG: FilterGroup[] = [
  {
    id: "difficulty",
    title: "Độ khó",
    type: "checkbox",
    options: [
      { label: "Easy", value: "EASY" },
      { label: "Medium", value: "MEDIUM" },
      { label: "Hard", value: "HARD" },
    ],
  },
  {
    id: "language",
    title: "Ngôn ngữ",
    type: "checkbox",
    options: [
      { label: "Java", value: "Java" },
      { label: "TypeScript", value: "TypeScript" },
      { label: "SQL", value: "SQL" },
    ],
  },
  {
    id: "topic",
    title: "Chủ đề",
    type: "checkbox",
    options: [
      { label: "Arrays", value: "Arrays" },
      { label: "Strings", value: "Strings" },
      { label: "Trees", value: "Trees" },
      { label: "Dynamic Programming", value: "Dynamic Programming" },
      { label: "SQL", value: "SQL" },
      { label: "System Design", value: "System Design" },
    ],
  },
];

export default function ChallengeLibraryPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  const filteredChallenges = useMemo(() => {
    return PREVIEW_CHALLENGES.filter((challenge) => {
      // Search filter
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase();
        if (!challenge.title.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Difficulty filter
      const difficulties = (filters.difficulty as string[]) || [];
      if (difficulties.length > 0 && !difficulties.includes(challenge.difficulty)) {
        return false;
      }

      // Language filter
      const languages = (filters.language as string[]) || [];
      if (languages.length > 0 && !challenge.languages.some((lang) => languages.includes(lang))) {
        return false;
      }

      // Topic filter
      const topics = (filters.topic as string[]) || [];
      if (topics.length > 0 && !challenge.topics.some((topic) => topics.includes(topic))) {
        return false;
      }

      return true;
    });
  }, [debouncedSearch, filters]);

  return (
    <div className="challenge-library">
      <div className="challenge-library__sidebar">
        <FilterSidebar
          filters={FILTER_CONFIG}
          value={filters}
          onChange={setFilters}
        />
      </div>

      <div className="challenge-library__content">
        <div className="challenge-library__header">
          <div className="challenge-library__search">
            <input
              type="text"
              placeholder="Tìm kiếm challenge..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Tìm kiếm challenge"
            />
          </div>
          <span className="challenge-library__count">
            {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? "s" : ""}
          </span>
        </div>

        {filteredChallenges.length > 0 ? (
          <div className="challenge-library__grid">
            {filteredChallenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        ) : (
          <div className="challenge-library__empty">
            Không tìm thấy challenge phù hợp
          </div>
        )}
      </div>
    </div>
  );
}

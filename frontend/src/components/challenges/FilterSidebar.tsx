"use client";

import type { ChallengeFilter } from "@/lib/challenges/filter";
import { Checkbox } from "@/components/ui/primitives";

export interface FilterSidebarProps {
  /** Current active filters (controlled) */
  filters: ChallengeFilter;
  /** Callback fired immediately on any filter change with the new filter state */
  onChange: (filters: ChallengeFilter) => void;
  /** Available programming languages for filter options */
  availableLanguages: string[];
  /** Available topics for filter options */
  availableTopics: string[];
}

const DIFFICULTY_OPTIONS: Array<{ value: "EASY" | "MEDIUM" | "HARD"; label: string }> = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const STATUS_OPTIONS: Array<{ value: "solved" | "unsolved"; label: string }> = [
  { value: "solved", label: "Solved" },
  { value: "unsolved", label: "Unsolved" },
];

/**
 * FilterSidebar for the Challenge Library.
 * Provides checkbox groups for difficulty, language, topic, and solved/unsolved status.
 * Each change calls onChange immediately for < 100ms response via useMemo(filterChallenges).
 * Accessible: uses fieldset/legend for each group, keyboard navigable via Tab.
 */
export function FilterSidebar({
  filters,
  onChange,
  availableLanguages,
  availableTopics,
}: FilterSidebarProps) {
  const handleDifficultyChange = (value: "EASY" | "MEDIUM" | "HARD", checked: boolean) => {
    if (checked) {
      onChange({ ...filters, difficulty: value });
    } else {
      const { difficulty: _, ...rest } = filters;
      onChange(rest);
    }
  };

  const handleLanguageChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange({ ...filters, language: value });
    } else {
      const { language: _, ...rest } = filters;
      onChange(rest);
    }
  };

  const handleTopicChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange({ ...filters, topic: value });
    } else {
      const { topic: _, ...rest } = filters;
      onChange(rest);
    }
  };

  const handleStatusChange = (value: "solved" | "unsolved", checked: boolean) => {
    if (checked) {
      onChange({ ...filters, solved: value === "solved" });
    } else {
      const { solved: _, ...rest } = filters;
      onChange(rest);
    }
  };

  return (
    <aside className="dh-filter-sidebar" aria-label="Challenge filters">
      {/* Difficulty Group */}
      <fieldset className="dh-filter-sidebar__group">
        <legend className="dh-filter-sidebar__legend">Difficulty</legend>
        <div className="dh-filter-sidebar__options">
          {DIFFICULTY_OPTIONS.map((option) => (
            <Checkbox
              key={option.value}
              id={`filter-difficulty-${option.value}`}
              label={option.label}
              checked={filters.difficulty === option.value}
              onChange={(e) =>
                handleDifficultyChange(option.value, e.target.checked)
              }
            />
          ))}
        </div>
      </fieldset>

      {/* Language Group */}
      <fieldset className="dh-filter-sidebar__group">
        <legend className="dh-filter-sidebar__legend">Language</legend>
        <div className="dh-filter-sidebar__options">
          {availableLanguages.map((lang) => (
            <Checkbox
              key={lang}
              id={`filter-language-${lang}`}
              label={lang}
              checked={filters.language?.toLowerCase() === lang.toLowerCase()}
              onChange={(e) => handleLanguageChange(lang, e.target.checked)}
            />
          ))}
        </div>
      </fieldset>

      {/* Topic Group */}
      <fieldset className="dh-filter-sidebar__group">
        <legend className="dh-filter-sidebar__legend">Topic</legend>
        <div className="dh-filter-sidebar__options">
          {availableTopics.map((topic) => (
            <Checkbox
              key={topic}
              id={`filter-topic-${topic}`}
              label={topic}
              checked={filters.topic?.toLowerCase() === topic.toLowerCase()}
              onChange={(e) => handleTopicChange(topic, e.target.checked)}
            />
          ))}
        </div>
      </fieldset>

      {/* Status Group (Radio-like behavior via checkboxes) */}
      <fieldset className="dh-filter-sidebar__group">
        <legend className="dh-filter-sidebar__legend">Status</legend>
        <div className="dh-filter-sidebar__options">
          {STATUS_OPTIONS.map((option) => (
            <Checkbox
              key={option.value}
              id={`filter-status-${option.value}`}
              label={option.label}
              checked={
                option.value === "solved"
                  ? filters.solved === true
                  : filters.solved === false
              }
              onChange={(e) =>
                handleStatusChange(option.value, e.target.checked)
              }
            />
          ))}
        </div>
      </fieldset>
    </aside>
  );
}

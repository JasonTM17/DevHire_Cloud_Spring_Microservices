"use client";

import { Select } from "@/components/ui/primitives";
import type { SelectOption } from "@/components/ui/primitives";

export type LeaderboardPeriod = "weekly" | "monthly" | "all-time";

export interface LeaderboardFiltersProps {
  /** Currently selected period */
  period: LeaderboardPeriod;
  /** Currently selected topic (empty string = all topics) */
  topic: string;
  /** Callback when period changes */
  onPeriodChange: (period: LeaderboardPeriod) => void;
  /** Callback when topic changes */
  onTopicChange: (topic: string) => void;
  /** Available topics for the dropdown */
  availableTopics: string[];
  /** Additional CSS class */
  className?: string;
}

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "all-time", label: "All Time" },
];

/**
 * LeaderboardFilters provides period toggle buttons and a topic filter dropdown.
 *
 * - Period toggle: 3 buttons (weekly | monthly | all-time) with active state
 * - Topic filter: Select dropdown from available topics
 *
 * Uses --dh-* design tokens for styling.
 *
 * Requirements: 5.4
 */
export function LeaderboardFilters({
  period,
  topic,
  onPeriodChange,
  onTopicChange,
  availableTopics,
  className = "",
}: LeaderboardFiltersProps) {
  const topicOptions: SelectOption[] = [
    { value: "", label: "All Topics" },
    ...availableTopics.map((t) => ({ value: t, label: t })),
  ];

  return (
    <div
      className={`dh-leaderboard-filters ${className}`}
      data-testid="leaderboard-filters"
    >
      <div
        className="dh-leaderboard-filters__period-group"
        role="group"
        aria-label="Leaderboard period"
      >
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            className={`dh-leaderboard-filters__period-btn ${
              period === value ? "dh-leaderboard-filters__period-btn--active" : ""
            }`}
            onClick={() => onPeriodChange(value)}
            aria-pressed={period === value}
            data-testid={`period-btn-${value}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="dh-leaderboard-filters__topic">
        <Select
          id="leaderboard-topic-filter"
          label="Topic"
          options={topicOptions}
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          selectSize="sm"
          data-testid="topic-filter-select"
        />
      </div>
    </div>
  );
}

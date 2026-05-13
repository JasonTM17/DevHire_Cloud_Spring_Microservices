"use client";

import { useCallback } from "react";
import type { PublicChallenge } from "@/types/domain";
import { Badge } from "@/components/ui/primitives";
import { Tag } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/primitives";
import { Card } from "@/components/ui/layout/Card";
import { extractPreview } from "@/lib/challenges/preview";

export interface ChallengeCardProps {
  challenge: PublicChallenge;
  isFocused?: boolean;
  /** Display mode: compact card or expanded list row */
  viewMode?: "grid" | "list";
  onSelect?: () => void;
}

const difficultyVariant: Record<string, "easy" | "medium" | "hard"> = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

const difficultyLabel: Record<string, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

/**
 * ChallengeCard — Displays a single coding challenge with:
 * - Title
 * - Difficulty badge (Easy/Medium/Hard with color coding)
 * - Language tags
 * - Topic tags
 * - Solved/unsolved status indicator
 * - Brief description
 * - Acceptance rate
 *
 * On hover, shows a tooltip with the first 2 lines of the problem statement.
 * Supports both grid (compact card) and list (horizontal row) view modes.
 */
export function ChallengeCard({
  challenge,
  isFocused = false,
  viewMode = "grid",
  onSelect,
}: ChallengeCardProps) {
  const handleClick = useCallback(() => {
    onSelect?.();
  }, [onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect?.();
      }
    },
    [onSelect]
  );

  const preview = challenge.statement
    ? extractPreview(challenge.statement, 2)
    : undefined;

  const isListMode = viewMode === "list";
  const wrapperClass = isListMode
    ? "dh-challenge-card__wrapper dh-challenge-card__wrapper--list"
    : "dh-challenge-card__wrapper";

  const cardClass = [
    "dh-challenge-card",
    isFocused && "dh-challenge-card--focused",
    isListMode && "dh-challenge-card--list",
  ]
    .filter(Boolean)
    .join(" ");

  const cardContent = (
    <Card
      variant="outlined"
      padding="md"
      className={cardClass}
      onClick={handleClick}
    >
      <div className="dh-challenge-card__header">
        <h3 className="dh-challenge-card__title">{challenge.title}</h3>
        <span
          className={`dh-challenge-card__solved ${challenge.solved ? "dh-challenge-card__solved--yes" : ""}`}
          aria-label={challenge.solved ? "Solved" : "Not solved"}
          role="img"
        >
          {challenge.solved ? "✔" : "○"}
        </span>
      </div>

      {challenge.description && (
        <p className="dh-challenge-card__description">
          {challenge.description}
        </p>
      )}

      <div className="dh-challenge-card__meta">
        <Badge variant={difficultyVariant[challenge.difficulty]}>
          {difficultyLabel[challenge.difficulty]}
        </Badge>
        <span className="dh-challenge-card__acceptance" aria-label={`Acceptance rate ${challenge.acceptanceRate.toFixed(1)} percent`}>
          {challenge.acceptanceRate.toFixed(1)}%
        </span>
      </div>

      {challenge.languages.length > 0 && (
        <div className="dh-challenge-card__tags" aria-label="Languages">
          {challenge.languages.map((lang) => (
            <Tag key={lang} variant="brand">
              {lang}
            </Tag>
          ))}
        </div>
      )}

      {challenge.topics.length > 0 && (
        <div className="dh-challenge-card__tags" aria-label="Topics">
          {challenge.topics.map((topic) => (
            <Tag key={topic} variant="neutral">
              {topic}
            </Tag>
          ))}
        </div>
      )}
    </Card>
  );

  const cardElement = (
    <div
      role="option"
      aria-selected={isFocused}
      aria-label={`${challenge.title}, ${difficultyLabel[challenge.difficulty]}, ${challenge.solved ? "solved" : "not solved"}`}
      tabIndex={isFocused ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={wrapperClass}
      data-testid={`challenge-card-${challenge.id}`}
    >
      {cardContent}
    </div>
  );

  if (preview) {
    return (
      <Tooltip content={preview} position="top" multiline delay={300}>
        {cardElement}
      </Tooltip>
    );
  }

  return cardElement;
}

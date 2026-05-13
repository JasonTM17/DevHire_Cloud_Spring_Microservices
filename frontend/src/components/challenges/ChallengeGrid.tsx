"use client";

import { useState, useCallback, useRef } from "react";
import type { PublicChallenge } from "@/types/domain";
import { nextIndex } from "@/lib/keyboardNav";
import { ChallengeCard } from "./ChallengeCard";

export type ViewMode = "grid" | "list";

export interface ChallengeGridProps {
  challenges: PublicChallenge[];
  /** Display mode: responsive grid or vertical list */
  viewMode?: ViewMode;
  onSelectChallenge?: (id: string) => void;
}

/**
 * ChallengeGrid — Renders a responsive layout of ChallengeCard components.
 * Supports both grid (multi-column cards) and list (single-column rows) view modes.
 * Includes keyboard navigation (ArrowUp/Down/Home/End) with focused index state.
 */
export function ChallengeGrid({
  challenges,
  viewMode = "grid",
  onSelectChallenge,
}: ChallengeGridProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const supportedKeys = ["ArrowDown", "ArrowUp", "Home", "End", "Enter"];
      if (!supportedKeys.includes(e.key)) return;

      e.preventDefault();

      if (e.key === "Enter") {
        const challenge = challenges[focusedIndex];
        if (challenge) {
          onSelectChallenge?.(challenge.id);
        }
        return;
      }

      const newIndex = nextIndex(challenges.length, focusedIndex, e.key);
      setFocusedIndex(newIndex);

      // Scroll focused card into view
      const container = containerRef.current;
      if (container) {
        const cards = container.querySelectorAll('[role="option"]');
        const focusedCard = cards[newIndex] as HTMLElement | undefined;
        focusedCard?.scrollIntoView({ block: "nearest" });
        focusedCard?.focus();
      }
    },
    [challenges, focusedIndex, onSelectChallenge]
  );

  const handleCardSelect = useCallback(
    (index: number) => {
      setFocusedIndex(index);
      const challenge = challenges[index];
      if (challenge) {
        onSelectChallenge?.(challenge.id);
      }
    },
    [challenges, onSelectChallenge]
  );

  if (challenges.length === 0) {
    return null;
  }

  const containerClass = viewMode === "list"
    ? "dh-challenge-grid dh-challenge-grid--list"
    : "dh-challenge-grid";

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Challenge list"
      aria-orientation="vertical"
      className={containerClass}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {challenges.map((challenge, index) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          isFocused={index === focusedIndex}
          viewMode={viewMode}
          onSelect={() => handleCardSelect(index)}
        />
      ))}
    </div>
  );
}

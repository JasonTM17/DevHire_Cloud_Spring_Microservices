import type { PublicChallenge } from "@/types/domain";

/**
 * Re-export PublicChallenge for convenience.
 */
export type { PublicChallenge } from "@/types/domain";

/**
 * Filter criteria for the challenge library.
 * All fields are optional — undefined means "no filtering on that dimension".
 * When multiple fields are set, they combine with AND logic.
 */
export type ChallengeFilter = {
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  language?: string;
  topic?: string;
  solved?: boolean;
};

/**
 * Filter a list of challenges by the given criteria (AND logic).
 * Empty/undefined filter fields are ignored (no filtering on that dimension).
 *
 * Pure function — no side effects.
 */
export function filterChallenges(
  list: PublicChallenge[],
  filter: ChallengeFilter
): PublicChallenge[] {
  return list.filter((challenge) => {
    if (
      filter.difficulty !== undefined &&
      challenge.difficulty !== filter.difficulty
    ) {
      return false;
    }

    if (
      filter.language !== undefined &&
      !challenge.languages.some(
        (lang) => lang.toLowerCase() === filter.language!.toLowerCase()
      )
    ) {
      return false;
    }

    if (
      filter.topic !== undefined &&
      !challenge.topics.some(
        (topic) => topic.toLowerCase() === filter.topic!.toLowerCase()
      )
    ) {
      return false;
    }

    if (filter.solved !== undefined && challenge.solved !== filter.solved) {
      return false;
    }

    return true;
  });
}

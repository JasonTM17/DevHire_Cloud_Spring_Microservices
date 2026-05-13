/**
 * A single submission record used to compute progress.
 */
export type SubmissionRecord = {
  challengeId: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  verdict: "ACCEPTED" | "WRONG_ANSWER" | "TLE" | "COMPILE_ERROR";
  submittedAt: string; // ISO 8601 timestamp
};

/**
 * Aggregated progress summary for a candidate.
 */
export type ProgressSummary = {
  totalSolved: number;
  byDifficulty: { easy: number; medium: number; hard: number };
  streak: number;
  rank?: number;
};

/**
 * Compute progress summary from a list of submission records.
 *
 * - `totalSolved`: count of unique challenges with at least one "Accepted" verdict.
 * - `byDifficulty`: breakdown of solved challenges by difficulty level.
 * - `streak`: consecutive days (counting backward from today) with at least one accepted submission.
 * - `rank`: not computed here (requires leaderboard data), always undefined.
 *
 * Pure function — no side effects. Uses `now` parameter for testability (defaults to current date).
 */
export function computeProgress(
  submissions: SubmissionRecord[],
  now?: Date
): ProgressSummary {
  const accepted = submissions.filter((s) => s.verdict === "ACCEPTED");

  // Unique solved challenges
  const solvedSet = new Set<string>();
  const solvedByDifficulty = { easy: 0, medium: 0, hard: 0 };

  for (const sub of accepted) {
    if (!solvedSet.has(sub.challengeId)) {
      solvedSet.add(sub.challengeId);
      switch (sub.difficulty) {
        case "EASY":
          solvedByDifficulty.easy++;
          break;
        case "MEDIUM":
          solvedByDifficulty.medium++;
          break;
        case "HARD":
          solvedByDifficulty.hard++;
          break;
      }
    }
  }

  // Streak: consecutive days with at least one accepted submission, counting backward from today
  const streak = computeStreak(accepted, now ?? new Date());

  return {
    totalSolved: solvedSet.size,
    byDifficulty: solvedByDifficulty,
    streak,
  };
}

/**
 * Compute the streak of consecutive days with at least one accepted submission,
 * counting backward from `today`.
 */
function computeStreak(
  acceptedSubmissions: SubmissionRecord[],
  today: Date
): number {
  if (acceptedSubmissions.length === 0) {
    return 0;
  }

  // Collect unique days (as date strings YYYY-MM-DD) that have accepted submissions
  const daysWithAccepted = new Set<string>();
  for (const sub of acceptedSubmissions) {
    const date = new Date(sub.submittedAt);
    daysWithAccepted.add(toDateString(date));
  }

  // Count consecutive days backward from today
  let streak = 0;
  const current = new Date(today);
  // Normalize to start of day
  current.setHours(0, 0, 0, 0);

  while (true) {
    const dateStr = toDateString(current);
    if (daysWithAccepted.has(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Convert a Date to a YYYY-MM-DD string in local time.
 */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Badge } from "./ui/Badge";

export type PublicChallenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  languages: string[];
  topics: string[];
  acceptanceRate: number;
  totalSubmissions: number;
  solved: boolean;
};

type ChallengeCardProps = {
  challenge: PublicChallenge;
};

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

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  return (
    <Link href={`/challenges/${challenge.slug}`} className="card challenge-card">
      <div className="challenge-card__header">
        <h3 className="challenge-card__title">{challenge.title}</h3>
        {challenge.solved && (
          <CheckCircle size={20} className="challenge-card__solved" />
        )}
      </div>

      <Badge variant={difficultyVariant[challenge.difficulty]}>
        {difficultyLabel[challenge.difficulty]}
      </Badge>

      <div className="challenge-card__languages">
        {challenge.languages.map((lang) => (
          <span key={lang} className="challenge-card__lang-badge">
            {lang}
          </span>
        ))}
      </div>

      <div className="challenge-card__topics">
        {challenge.topics.map((topic) => (
          <span key={topic} className="challenge-card__topic">
            {topic}
          </span>
        ))}
      </div>

      <div className="challenge-card__footer">
        <span className="challenge-card__acceptance">
          Acceptance: {challenge.acceptanceRate.toFixed(1)}%
        </span>
      </div>
    </Link>
  );
}

"use client";

type SkillTagProps = {
  skill: string;
  onClick?: (skill: string) => void;
};

export function SkillTag({ skill, onClick }: SkillTagProps) {
  return (
    <span className="skill-tag" onClick={() => onClick?.(skill)}>
      {skill}
    </span>
  );
}

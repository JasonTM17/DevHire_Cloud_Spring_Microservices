"use client";

import { useEffect, useState } from "react";
import { GraduationCap, ShieldCheck, Trophy } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { previewCandidateAssessments } from "@/lib/previewData";
import type { CandidateAssessment } from "@/types/domain";

export default function CandidateAssessmentsPage() {
  const [assessments, setAssessments] = useState<CandidateAssessment[]>(previewCandidateAssessments);

  useEffect(() => {
    api.candidateAssessments().then(setAssessments).catch(() => setAssessments(previewCandidateAssessments));
  }, []);

  const passed = assessments.filter((item) => item.status === "PASSED").length;
  const average = Math.round(assessments.reduce((sum, item) => sum + item.score, 0) / Math.max(assessments.length, 1));

  return (
    <section className="page-stack" data-testid="candidate-assessments-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Skill assessment</p>
          <h1>Verified technical proof</h1>
          <p>Showcase backend, cloud, search, event reliability, and operations readiness with measurable skill checks.</p>
        </div>
        <div className="hero-actions">
          <span className="badge live">Reviewer-ready</span>
          <span className="badge">No raw assessment IDs</span>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={GraduationCap} label="Assessments" value={assessments.length} helper="Skill checks" />
        <MetricCard icon={Trophy} label="Passed" value={passed} helper="Verified outcomes" />
        <MetricCard icon={ShieldCheck} label="Average" value={`${average}%`} helper="Across completed checks" />
      </div>
      <div className="table-list">
        {assessments.map((item) => (
          <div className="table-row" key={item.id}>
            <span>
              <strong>{item.title}</strong>
              <small>{item.provider} / {item.skills.join(", ")}</small>
            </span>
            <strong>{item.score ? `${item.score}/${item.maxScore}` : "In progress"}</strong>
            <StatusPill value={item.status} />
          </div>
        ))}
      </div>
    </section>
  );
}

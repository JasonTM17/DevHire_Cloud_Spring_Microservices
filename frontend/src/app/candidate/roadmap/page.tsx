"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, Map, Target } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { previewCandidateRoadmap } from "@/lib/previewData";
import type { CandidateRoadmap } from "@/types/domain";

export default function CandidateRoadmapPage() {
  const [roadmap, setRoadmap] = useState<CandidateRoadmap>(previewCandidateRoadmap);

  useEffect(() => {
    api.candidateRoadmap().then(setRoadmap).catch(() => setRoadmap(previewCandidateRoadmap));
  }, []);

  return (
    <section className="page-stack" data-testid="candidate-roadmap-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Cloud career roadmap</p>
          <h1>{roadmap.title}</h1>
          <p>{roadmap.currentTrack}</p>
        </div>
        <div className="hero-actions">
          <Link className="button secondary" href="/candidate/interview-prep">
            <Bot size={16} />
            Practice with AI
          </Link>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={Target} label="Readiness" value={`${roadmap.readinessScore}%`} helper="Portfolio interview signal" />
        <MetricCard icon={Map} label="Milestones" value={roadmap.milestones.length} helper="Cloud backend track" />
        <MetricCard icon={CheckCircle2} label="Prompts" value={roadmap.recommendedPrompts.length} helper="AI prep suggestions" />
      </div>
      <div className="split-grid">
        <div className="panel">
          <h2>Milestones</h2>
          <div className="table-list">
            {roadmap.milestones.map((item) => (
              <div className="table-row" key={item.title}>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.evidence}</small>
                </span>
                <StatusPill value={item.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Next actions</h2>
          <div className="stack">
            {roadmap.milestones.map((item) => (
              <div className="pipeline-step" key={item.nextAction}>
                <span className="step-index">{item.status === "COMPLETED" ? "✓" : "→"}</span>
                <span>{item.nextAction}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

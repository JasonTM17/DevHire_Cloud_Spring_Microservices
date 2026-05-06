"use client";

import { useEffect, useState } from "react";
import { BarChart3, BriefcaseBusiness, DollarSign } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { api } from "@/lib/api";
import { previewSkillAnalytics } from "@/lib/previewData";
import type { SkillAnalytics } from "@/types/domain";

export default function CandidateSkillAnalyticsPage() {
  const [analytics, setAnalytics] = useState<SkillAnalytics>(previewSkillAnalytics);

  useEffect(() => {
    api.candidateSkillAnalytics().then(setAnalytics).catch(() => setAnalytics(previewSkillAnalytics));
  }, []);

  return (
    <section className="page-stack" data-testid="candidate-skill-analytics-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Cloud skill analytics</p>
          <h1>Market demand signals</h1>
          <p>Analyze published roles to understand which Java, Kafka, cloud, and observability skills are moving.</p>
        </div>
        <div className="hero-actions">
          <span className="badge live">Derived from job-service</span>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={BriefcaseBusiness} label="Published jobs" value={analytics.publishedJobs} helper="Searchable roles" />
        <MetricCard icon={DollarSign} label="Salary floor" value={`$${analytics.averageSalaryMin}`} helper="Average minimum" />
        <MetricCard icon={BarChart3} label="Salary ceiling" value={`$${analytics.averageSalaryMax}`} helper="Average maximum" />
      </div>
      <div className="split-grid">
        <div className="panel">
          <h2>Top skills</h2>
          <div className="insight-list compact">
            {analytics.topSkills.map((item) => (
              <div className="insight-line" key={item.skill}>
                <span>{item.skill}</span>
                <strong>{item.jobs}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Locations and levels</h2>
          <div className="insight-list compact">
            {[...analytics.topLocations, ...analytics.levelDistribution].slice(0, 10).map((item) => {
              const label = "location" in item ? item.location : item.level;
              return (
                <div className="insight-line" key={label}>
                  <span>{label}</span>
                  <strong>{item.jobs}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

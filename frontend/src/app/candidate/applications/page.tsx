"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, FileCheck2, ShieldCheck } from "lucide-react";
import { CandidateTimeline } from "@/components/CandidateTimeline";
import { MetricCard } from "@/components/MetricCard";
import { StatusDistributionList } from "@/components/StatusDistributionList";
import { api } from "@/lib/api";
import { previewCandidateApplicationsSummary } from "@/lib/previewData";
import type { CandidateApplicationsSummary } from "@/types/domain";

export default function CandidateApplicationsPage() {
  const [summary, setSummary] = useState<CandidateApplicationsSummary>(previewCandidateApplicationsSummary);

  useEffect(() => {
    api.candidateApplicationsSummary()
      .then(setSummary)
      .catch(() => setSummary(previewCandidateApplicationsSummary));
  }, []);

  return (
    <section className="page-stack" data-testid="candidate-applications-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">My applications</p>
          <h1>Application pipeline</h1>
          <p>Track every application stage with duplicate protection, status history, and offer readiness.</p>
        </div>
        <div className="hero-actions">
          <Link className="button secondary" href="/jobs">Discover more jobs</Link>
          <Link className="button outline" href="/candidate/offers">View offers</Link>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={ClipboardList} label="Total" value={summary.totalApplications} helper="Applications submitted" />
        <MetricCard icon={ShieldCheck} label="Protected" value={summary.duplicateProtectedJobs} helper="Unique job submissions" />
        <MetricCard icon={FileCheck2} label="Active stages" value={summary.statusDistribution.length} helper="Status distribution" />
      </div>
      <div className="split-grid">
        <div className="panel">
          <h2>Status distribution</h2>
          <StatusDistributionList items={summary.statusDistribution} />
        </div>
        <div className="panel">
          <h2>Recent movement</h2>
          <CandidateTimeline items={summary.recentActivity} />
        </div>
      </div>
    </section>
  );
}

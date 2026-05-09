"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ClipboardList, FileCheck2, MailCheck, Map, TimerReset, TrendingUp } from "lucide-react";
import { CandidateTimeline } from "@/components/CandidateTimeline";
import { MetricCard } from "@/components/MetricCard";
import { StatusDistributionList } from "@/components/StatusDistributionList";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { previewCandidateDashboardSummary, previewNotifications } from "@/lib/previewData";
import type { CandidateDashboardSummary, Notification, PageResponse } from "@/types/domain";

export default function CandidatePage() {
  const [notifications, setNotifications] = useState<PageResponse<Notification> | null>(null);
  const [summary, setSummary] = useState<CandidateDashboardSummary>(previewCandidateDashboardSummary);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.notifications(), api.candidateDashboardSummary()])
      .then(([notis, dashboard]) => {
        setNotifications(notis);
        setSummary(dashboard);
      })
      .catch(() => {
        setNotifications(previewNotifications);
        setSummary(previewCandidateDashboardSummary);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markAllRead() {
    await api.readAllNotifications();
    load();
  }

  const unread = notifications?.content.filter((item) => !item.read).length ?? 0;
  return (
    <section className="page-stack" data-testid="candidate-dashboard">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Candidate workspace</p>
          <h1>Applications</h1>
          <p>
            A Stitch-aligned client workspace for job discovery, application movement, offers, skill proof, and AI
            interview preparation.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button secondary" href="/candidate/offers">
            <FileCheck2 size={16} />
            Review offers
          </Link>
          <Link className="button outline" href="/candidate/roadmap">
            <Map size={16} />
            Roadmap
          </Link>
          <button className="button secondary" type="button" onClick={markAllRead}>
            <MailCheck size={16} />
            Mark all read
          </button>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={ClipboardList} label="Applications" value={summary.applications} helper="Submitted jobs" />
        <MetricCard icon={Bell} label="Unread" value={unread} helper="Internal notifications" />
        <MetricCard icon={TrendingUp} label="Interviews" value={summary.interviews} helper="Pipeline movement" />
        <MetricCard icon={FileCheck2} label="Offers" value={summary.offers} helper="Offer review ready" />
      </div>
      <div className="split-grid">
        <div className="panel">
          <div className="section-title">
            <TimerReset size={20} />
            <h2>Application tracker</h2>
          </div>
          <StatusDistributionList items={summary.statusDistribution} />
          {loading ? <div className="empty-state compact">Syncing candidate pipeline...</div> : null}
          {!loading ? <CandidateTimeline items={summary.timeline} /> : null}
        </div>
        <div className="panel">
          <h2>Notifications</h2>
          <div className="stack">
            {loading ? <div className="empty-state compact">Syncing notification inbox...</div> : null}
            {!loading && notifications?.content.length === 0 ? (
              <div className="empty-state compact">No notifications yet. Status updates will appear here.</div>
            ) : null}
            {!loading && notifications?.content.map((item) => (
              <div className={item.read ? "notification" : "notification unread"} key={item.id}>
                <div className="status-line">
                  <strong>{item.title}</strong>
                  <StatusPill value={item.read ? "READ" : "UNREAD"} />
                </div>
                <p>{item.message}</p>
                {item.emailStatus ? <span className="muted">Email delivery: {emailStatusLabel(item.emailStatus)}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="dashboard-grid">
        <Link className="panel action-panel" href="/candidate/assessments">
          <p className="eyebrow">Skill assessment</p>
          <h2>Verified backend skills</h2>
          <span className="muted">Java, Kafka, AWS, observability proof for employer review.</span>
        </Link>
        <Link className="panel action-panel" href="/candidate/interview-prep">
          <p className="eyebrow">AI prep</p>
          <h2>Interview practice hub</h2>
          <span className="muted">Claude prompts, citations, and production interview drills.</span>
        </Link>
        <Link className="panel action-panel" href="/candidate/skill-analytics">
          <p className="eyebrow">Market signals</p>
          <h2>Cloud skill analytics</h2>
          <span className="muted">Demand, salary bands, locations, and role distribution.</span>
        </Link>
      </div>
    </section>
  );
}

function emailStatusLabel(status: string) {
  if (status === "DISABLED") return "internal notification only";
  if (status === "FAILED_RETRYABLE") return "queued for retry";
  return status.toLowerCase().replaceAll("_", " ");
}

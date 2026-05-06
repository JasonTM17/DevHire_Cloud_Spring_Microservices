"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ClipboardList, FileCheck2, MailCheck, Map, TimerReset, TrendingUp } from "lucide-react";
import { DemoModeNotice } from "@/components/DemoModeNotice";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { previewApplications, previewCandidateDashboardSummary, previewNotifications } from "@/lib/previewData";
import type { Application, CandidateDashboardSummary, Notification, PageResponse } from "@/types/domain";

export default function CandidatePage() {
  const [applications, setApplications] = useState<PageResponse<Application> | null>(null);
  const [notifications, setNotifications] = useState<PageResponse<Notification> | null>(null);
  const [summary, setSummary] = useState<CandidateDashboardSummary>(previewCandidateDashboardSummary);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.myApplications(), api.notifications(), api.candidateDashboardSummary()])
      .then(([apps, notis, dashboard]) => {
        setApplications(apps);
        setNotifications(notis);
        setSummary(dashboard);
        setError("");
      })
      .catch((ex) => {
        setApplications(previewApplications);
        setNotifications(previewNotifications);
        setSummary(previewCandidateDashboardSummary);
        setError(previewDashboardMessage(ex));
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
      <DemoModeNotice message={error} />
      <div className="split-grid">
        <div className="panel">
          <div className="section-title">
            <TimerReset size={20} />
            <h2>Application tracker</h2>
          </div>
          <div className="insight-list compact">
            {summary.statusDistribution.map(({ status, count }) => (
              <div className="insight-line" key={status}>
                <span>{status.toLowerCase().replace("_", " ")}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
          <div className="table-list">
            {loading ? <div className="empty-state compact">Loading candidate applications...</div> : null}
            {!loading && applications?.content.length === 0 ? (
              <div className="empty-state compact">No applications yet. Apply to a published job to start the pipeline.</div>
            ) : null}
            {!loading && applications?.content.map((item) => (
              <div className="table-row" key={item.id}>
                <span>
                  <strong>{applicationTitle(item.jobId)}</strong>
                  <small>Submitted {new Date(item.createdAt).toLocaleDateString()}</small>
                </span>
                <StatusPill value={item.status} />
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <h2>Notifications</h2>
          <div className="stack">
            {loading ? <div className="empty-state compact">Loading notification inbox...</div> : null}
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

function previewDashboardMessage(ex: unknown) {
  const message = ex instanceof Error ? ex.message : "";
  if (!message || message === "Failed to fetch") {
    return "";
  }
  return `${message}. Curated candidate data is active for this reviewer session.`;
}

function applicationTitle(jobId: string) {
  const titles: Record<string, string> = {
    "preview-java-platform": "Senior Java Platform Engineer",
    "preview-cloud-search": "Search Platform Engineer",
    "preview-sre": "Backend SRE Engineer"
  };
  return titles[jobId] ?? "Portfolio job";
}

function emailStatusLabel(status: string) {
  if (status === "DISABLED") return "internal notification only";
  if (status === "FAILED_RETRYABLE") return "queued for retry";
  return status.toLowerCase().replaceAll("_", " ");
}

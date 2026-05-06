"use client";

import { useEffect, useState } from "react";
import { Bell, ClipboardList, MailCheck, TimerReset, TrendingUp } from "lucide-react";
import { DemoModeNotice } from "@/components/DemoModeNotice";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { previewApplications, previewNotifications } from "@/lib/previewData";
import type { Application, Notification, PageResponse } from "@/types/domain";

export default function CandidatePage() {
  const [applications, setApplications] = useState<PageResponse<Application> | null>(null);
  const [notifications, setNotifications] = useState<PageResponse<Notification> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.myApplications(), api.notifications()])
      .then(([apps, notis]) => {
        setApplications(apps);
        setNotifications(notis);
        setError("");
      })
      .catch((ex) => {
        setApplications(previewApplications);
        setNotifications(previewNotifications);
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
  const statusCounts = countBy(applications?.content ?? [], (item) => item.status);

  return (
    <section className="page-stack" data-testid="candidate-dashboard">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Candidate workspace</p>
          <h1>Applications</h1>
          <p>
            A focused applicant cockpit for tracking CV submissions, status movement, notification delivery, and email
            follow-up from the notification-service.
          </p>
        </div>
        <div className="hero-actions">
          <span className="badge live">Email queue persisted</span>
          <button className="button secondary" type="button" onClick={markAllRead}>
            <MailCheck size={16} />
            Mark all read
          </button>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={ClipboardList} label="Applications" value={applications?.totalElements ?? 0} helper="Submitted jobs" />
        <MetricCard icon={Bell} label="Unread" value={unread} helper="Internal notifications" />
        <MetricCard icon={TrendingUp} label="Pipeline" value="Live" helper="Kafka status events" />
      </div>
      <DemoModeNotice message={error} />
      <div className="split-grid">
        <div className="panel">
          <div className="section-title">
            <TimerReset size={20} />
            <h2>Application tracker</h2>
          </div>
          <div className="insight-list compact">
            {["SUBMITTED", "REVIEWING", "INTERVIEW", "OFFER"].map((status) => (
              <div className="insight-line" key={status}>
                <span>{status.toLowerCase().replace("_", " ")}</span>
                <strong>{statusCounts[status] ?? 0}</strong>
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

function countBy<T>(items: T[], selector: (item: T) => string) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

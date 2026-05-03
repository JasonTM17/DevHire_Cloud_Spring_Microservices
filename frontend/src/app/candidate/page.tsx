"use client";

import { useEffect, useState } from "react";
import { Bell, ClipboardList, MailCheck, TimerReset, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import type { Application, Notification, PageResponse } from "@/types/domain";

export default function CandidatePage() {
  const [applications, setApplications] = useState<PageResponse<Application> | null>(null);
  const [notifications, setNotifications] = useState<PageResponse<Notification> | null>(null);
  const [error, setError] = useState("");

  function load() {
    Promise.all([api.myApplications(), api.notifications()])
      .then(([apps, notis]) => {
        setApplications(apps);
        setNotifications(notis);
      })
      .catch((ex) => setError(ex instanceof Error ? ex.message : "Cannot load candidate dashboard"));
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
      {error ? <p className="error">{error}</p> : null}
      <div className="split-grid">
        <div className="panel">
          <div className="section-title">
            <TimerReset size={20} />
            <h2>Application tracker</h2>
          </div>
          <div className="table-list">
            {applications?.content.map((item) => (
              <div className="table-row" key={item.id}>
                <span>
                  <strong>Job {item.jobId.slice(0, 8)}</strong>
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
            {notifications?.content.map((item) => (
              <div className={item.read ? "notification" : "notification unread"} key={item.id}>
                <div className="status-line">
                  <strong>{item.title}</strong>
                  <StatusPill value={item.read ? "READ" : "UNREAD"} />
                </div>
                <p>{item.message}</p>
                {item.emailStatus ? <span className="muted">Email: {item.emailStatus}</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

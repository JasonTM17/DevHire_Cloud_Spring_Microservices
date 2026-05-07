"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, MessageSquareText, ShieldCheck } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { previewInterviewPrep } from "@/lib/previewData";
import type { InterviewPrep } from "@/types/domain";

export default function InterviewPrepPage() {
  const [sessions, setSessions] = useState<InterviewPrep[]>(previewInterviewPrep);

  useEffect(() => {
    api.candidateInterviewPrep().then(setSessions).catch(() => setSessions(previewInterviewPrep));
  }, []);

  return (
    <section className="page-stack" data-testid="candidate-interview-prep-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">AI interview prep</p>
          <h1>Practice production engineering stories</h1>
          <p>Use Claude-assisted prompts to rehearse architecture, incident, cloud, and AI safety explanations.</p>
        </div>
        <div className="hero-actions">
          <Link className="button primary" href="/assistant">
            <Bot size={16} />
            Open assistant
          </Link>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={MessageSquareText} label="Prep sessions" value={sessions.length} helper="Conversation read model" />
        <MetricCard icon={ShieldCheck} label="Safety handoffs" value={sessions.filter((item) => item.fallback).length} helper="Provider backup visible when used" />
        <MetricCard icon={Bot} label="Model" value="Haiku" helper="Cost-aware default" />
      </div>
      <div className="job-grid">
        {sessions.map((item) => (
          <article className="job-card" key={item.conversationId}>
            <div className="job-card-top">
              <h2>{item.title}</h2>
              <StatusPill value={item.fallback ? "SAFETY_BACKUP" : "CLAUDE"} />
            </div>
            <p>{item.focusAreas.join(" / ")}</p>
            <span className="muted">Last practiced {new Date(item.lastMessageAt).toLocaleDateString()}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

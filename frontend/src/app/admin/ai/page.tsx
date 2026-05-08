"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, DatabaseZap, RefreshCw, ShieldCheck } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill, statusLabel } from "@/components/StatusPill";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/dateFormat";
import { previewAiProviderStatus } from "@/lib/previewData";
import type { AiProviderStatus } from "@/types/domain";

export default function AdminAiPage() {
  const [provider, setProvider] = useState<AiProviderStatus>(previewAiProviderStatus);
  const [message, setMessage] = useState("");
  const [reindexing, setReindexing] = useState(false);

  useEffect(() => {
    api.aiProviderStatus().then(setProvider).catch(() => setProvider(previewAiProviderStatus));
  }, []);

  async function reindexKnowledge() {
    try {
      setReindexing(true);
      const response = await api.reindexAiKnowledge();
      setMessage(`Knowledge index refreshed: ${response.documents} documents and ${response.chunks} chunks.`);
      setProvider(await api.aiProviderStatus());
    } catch (ex) {
      setMessage(ex instanceof Error ? ex.message : "Knowledge reindex was not completed");
    } finally {
      setReindexing(false);
    }
  }

  return (
    <section className="page-stack" data-testid="admin-ai-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">AI RAG talent intelligence</p>
          <h1>AI provider operations and safety posture</h1>
          <p>Review Claude Haiku configuration, circuit breaker state, knowledge indexing, citations, and safety controls.</p>
        </div>
        <div className="hero-actions">
          <Link className="button secondary" href="/assistant">
            <Bot size={16} />
            Open assistant
          </Link>
          <button className="button primary" type="button" onClick={reindexKnowledge} disabled={reindexing}>
            <RefreshCw size={16} />
            {reindexing ? "Refreshing" : "Refresh index"}
          </button>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={Bot} label="Model" value={provider.model.replace("claude-", "")} helper={provider.provider} />
        <MetricCard icon={ShieldCheck} label="Circuit" value={statusLabel(provider.circuitBreakerState)} helper={`${provider.consecutiveFailures} consecutive failures`} />
        <MetricCard icon={DatabaseZap} label="Knowledge" value="Indexed" helper="Docs, jobs, health snapshot" />
      </div>
      {message ? <p className={message.startsWith("Knowledge") ? "success" : "error"}>{message}</p> : null}
      <div className="panel">
        <div className="section-title">
          <ShieldCheck size={20} />
          <h2>Provider evidence</h2>
        </div>
        <div className="table-list">
          <div className="table-row">
            <span>
              <strong>{provider.provider} / {provider.model}</strong>
              <small>{provider.baseUrlHost} with Anthropic version {provider.anthropicVersion}</small>
            </span>
            <StatusPill value={provider.apiKeyConfigured ? "PROVIDER_READY" : "SAFE_PREVIEW"} />
          </div>
          <div className="table-row">
            <span>
              <strong>Token guardrail</strong>
              <small>Maximum response tokens: {provider.maxTokens}</small>
            </span>
            <StatusPill value={displayProviderMode(provider.mode)} />
          </div>
          <div className="table-row">
            <span>
              <strong>Last verification</strong>
              <small>{formatDateTime(provider.checkedAt)}</small>
            </span>
            <StatusPill value={provider.circuitBreakerState} />
          </div>
        </div>
      </div>
    </section>
  );
}

function displayProviderMode(mode: string) {
  return mode
    .replace("DEMO_FALLBACK", "REVIEWER_SAFE")
    .replace("CIRCUIT_OPEN_FALLBACK", "CIRCUIT_OPEN_SAFE_MODE");
}

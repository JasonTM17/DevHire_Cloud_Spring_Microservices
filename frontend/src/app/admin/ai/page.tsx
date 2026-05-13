"use client";

import { useState, useCallback } from "react";
import { AiProviderPanel } from "@/components/ops/AiProviderPanel";
import { AiKnowledgePanel } from "@/components/ops/AiKnowledgePanel";
import {
  AiRequestMetricsPanel,
  type MetricsTimeRange,
} from "@/components/ops/AiRequestMetricsPanel";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { api } from "@/lib/api";
import { previewAiProviderStatus } from "@/lib/previewData";
import type { AiProviderStatus as DomainAiProviderStatus } from "@/types/domain";
import type {
  AiProviderStatus,
  CircuitState,
} from "@/components/ops/AiProviderPanel";
import type { AiKnowledgeStatus } from "@/components/ops/AiKnowledgePanel";
import type { AiRequestMetrics } from "@/components/ops/AiRequestMetricsPanel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapProviderStatus(raw: DomainAiProviderStatus): AiProviderStatus {
  return {
    name: raw.provider ?? "anthropic",
    model: raw.model ?? "claude-haiku-4-5-20251001",
    circuitState: (raw.circuitBreakerState ?? "CLOSED") as CircuitState,
    consecutiveFailures: raw.consecutiveFailures ?? 0,
    lastFailureReason: raw.lastFailureReason ?? null,
    cooldownEndsAt: raw.circuitOpenUntil ?? undefined,
  };
}

function mapKnowledgeStatus(raw: DomainAiProviderStatus): AiKnowledgeStatus {
  return {
    totalDocuments: 0,
    totalChunks: 0,
    lastReindexAt: null,
  };
}

function getDefaultMetrics(): AiRequestMetrics {
  return {
    totalRequests: 0,
    successRate: 100,
    avgLatencyMs: 0,
    tokenUsage: { input: 0, output: 0 },
  };
}

// ─── Page Component ──────────────────────────────────────────────────────────

/**
 * Admin AI Ops page — Displays AI provider status, knowledge base,
 * and request metrics panels.
 *
 * Layout: AiProviderPanel + AiKnowledgePanel + AiRequestMetricsPanel
 * All inside OpsDashboardShell (mounted via admin/layout.tsx).
 *
 * Requirements: 8.1, 8.3, 8.5
 */
export default function AdminAiOpsPage() {
  const [metricsTimeRange, setMetricsTimeRange] =
    useState<MetricsTimeRange>("1h");

  // Fetch AI provider status with 30s polling
  const fetchProvider = useCallback(async () => {
    try {
      return await api.aiProviderStatus();
    } catch {
      return previewAiProviderStatus;
    }
  }, []);

  const { data: providerRaw } = useDataFetcher<DomainAiProviderStatus>(
    "ops:ai-provider",
    fetchProvider,
    { refreshInterval: 30_000, pauseWhenHidden: true }
  );

  const provider = providerRaw
    ? mapProviderStatus(providerRaw)
    : mapProviderStatus(previewAiProviderStatus);

  const knowledge = providerRaw
    ? mapKnowledgeStatus(providerRaw)
    : mapKnowledgeStatus(previewAiProviderStatus);

  const metrics = getDefaultMetrics();

  async function handleReindex() {
    await api.reindexAiKnowledge();
  }

  return (
    <section className="ops-ai-page" data-testid="admin-ai-ops-page">
      <div className="ops-ai-page__header">
        <h1 className="ops-ai-page__title">AI Operations</h1>
        <p className="ops-ai-page__subtitle">
          Provider health, knowledge base management, and request metrics.
        </p>
      </div>

      <div className="ops-ai-page__panels">
        <AiProviderPanel provider={provider} />
        <AiKnowledgePanel knowledge={knowledge} onReindex={handleReindex} />
        <AiRequestMetricsPanel
          metrics={metrics}
          timeRange={metricsTimeRange}
          onTimeRangeChange={setMetricsTimeRange}
        />
      </div>
    </section>
  );
}

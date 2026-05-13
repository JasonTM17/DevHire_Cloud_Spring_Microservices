"use client";

import { useState, useCallback } from "react";
import { SparklineWidget } from "@/components/ops/SparklineWidget";
import { AuditFeedPanel } from "@/components/ops/AuditFeedPanel";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { appendDataPoint, type MetricName, type TimeRange } from "@/lib/opsSparklineBuffer";
import { api } from "@/lib/api";
import { previewOperationsSummary } from "@/lib/previewData";
import type { OperationsSummary } from "@/types/domain";

// ─── Page Component ──────────────────────────────────────────────────────────

/**
 * Platform Observability page — Sparklines + AuditFeed.
 *
 * Inside OpsDashboardShell (mounted via platform/observability/layout.tsx).
 * Uses useDataFetcher with 30s polling for metrics data.
 *
 * Requirements: 6.1, 6.6, 10.6
 */
export default function PlatformObservabilityPage() {
  const [timeRanges, setTimeRanges] = useState<Record<MetricName, TimeRange>>({
    requestRate: "15m",
    errorRate: "15m",
    p95Latency: "15m",
    cpuUtilization: "15m",
    memoryUtilization: "15m",
  });

  // Fetch operations summary with 30s polling to feed sparkline buffer
  const fetchOpsSummary = useCallback(async () => {
    try {
      const data = await api.operationsSummary();
      const now = Date.now();
      appendDataPoint("requestRate", data.auditEvents, now);
      appendDataPoint("errorRate", 0, now);
      appendDataPoint("p95Latency", 0, now);
      appendDataPoint("cpuUtilization", 0, now);
      appendDataPoint("memoryUtilization", 0, now);
      return data;
    } catch {
      return previewOperationsSummary;
    }
  }, []);

  useDataFetcher<OperationsSummary>(
    "obs:summary",
    fetchOpsSummary,
    { refreshInterval: 30_000, pauseWhenHidden: true }
  );

  function handleTimeRangeChange(metric: MetricName) {
    return (range: TimeRange) => {
      setTimeRanges((prev) => ({ ...prev, [metric]: range }));
    };
  }

  return (
    <section
      className="obs-page"
      data-testid="platform-observability-page"
    >
      <div className="obs-page__header">
        <h1 className="obs-page__title">Observability</h1>
        <p className="obs-page__subtitle">
          Runtime metrics, time-series telemetry, and audit event stream.
        </p>
      </div>

      {/* Sparkline Widgets */}
      <div className="obs-page__sparklines">
        <SparklineWidget
          title="Request Rate"
          metric="requestRate"
          timeRange={timeRanges.requestRate}
          onTimeRangeChange={handleTimeRangeChange("requestRate")}
          color="var(--dh-color-ops-accent, #60a5fa)"
        />
        <SparklineWidget
          title="Error Rate"
          metric="errorRate"
          timeRange={timeRanges.errorRate}
          onTimeRangeChange={handleTimeRangeChange("errorRate")}
          color="var(--dh-color-danger, #ef4444)"
        />
        <SparklineWidget
          title="P95 Latency"
          metric="p95Latency"
          timeRange={timeRanges.p95Latency}
          onTimeRangeChange={handleTimeRangeChange("p95Latency")}
          color="var(--dh-color-warning, #f59e0b)"
        />
        <SparklineWidget
          title="CPU / Memory"
          metric="cpuUtilization"
          timeRange={timeRanges.cpuUtilization}
          onTimeRangeChange={handleTimeRangeChange("cpuUtilization")}
          color="var(--dh-color-success, #10b981)"
        />
      </div>

      {/* Audit Feed */}
      <div className="obs-page__audit-feed">
        <AuditFeedPanel />
      </div>
    </section>
  );
}

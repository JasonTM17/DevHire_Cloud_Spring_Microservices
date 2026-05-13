"use client";

import { useCallback, useState } from "react";
import { ServiceHealthMatrix } from "@/components/ops/ServiceHealthMatrix";
import { SparklineWidget } from "@/components/ops/SparklineWidget";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { api } from "@/lib/api";
import { buildOpsHealthSummary, unknownOpsHealthSummary } from "@/lib/ops";
import { appendDataPoint, type MetricName, type TimeRange } from "@/lib/opsSparklineBuffer";
import type { OpsHealthSummary } from "@/lib/ops";

export default function AdminOverviewPage() {
  const [timeRanges, setTimeRanges] = useState<Record<MetricName, TimeRange>>({
    requestRate: "15m",
    errorRate: "15m",
    p95Latency: "15m",
    cpuUtilization: "15m",
    memoryUtilization: "15m",
  });

  const fetchOpsHealth = useCallback(async (): Promise<OpsHealthSummary> => {
    try {
      const [operations, codeAssessments] = await Promise.all([
        api.operationsSummary(),
        api.codeAssessmentSummary(),
      ]);
      const now = Date.now();
      appendDataPoint("requestRate", operations.auditEvents, now);
      appendDataPoint("errorRate", codeAssessments.runnerUnavailableRate + codeAssessments.policyBlockedRate, now);
      appendDataPoint("p95Latency", codeAssessments.p95ExecutionMs, now);
      appendDataPoint("cpuUtilization", codeAssessments.runQueueDepth, now);
      appendDataPoint("memoryUtilization", codeAssessments.sandboxFailureRate, now);
      return buildOpsHealthSummary(operations, codeAssessments);
    } catch (error) {
      return unknownOpsHealthSummary(error instanceof Error ? error.message : "Admin health APIs unavailable");
    }
  }, []);

  const { data: opsHealth } = useDataFetcher<OpsHealthSummary>(
    "ops:health-summary",
    fetchOpsHealth,
    { refreshInterval: 30_000, pauseWhenHidden: true }
  );

  function handleTimeRangeChange(metric: MetricName) {
    return (range: TimeRange) => {
      setTimeRanges((prev) => ({ ...prev, [metric]: range }));
    };
  }

  const health = opsHealth ?? unknownOpsHealthSummary("Waiting for the first admin health poll.");

  return (
    <section className="ops-overview-page" data-testid="admin-overview-page">
      <div className="ops-overview-page__header">
        <h1 className="ops-overview-page__title">Operations Overview</h1>
        <p className="ops-overview-page__subtitle">
          Gateway, audit, application, and assessment-runner signals synthesized from live admin APIs.
        </p>
      </div>

      <div className="ops-overview-page__health-matrix">
        <ServiceHealthMatrix services={health.services} />
      </div>

      <div className="ops-overview-page__sparklines">
        <SparklineWidget
          title="Audit Events"
          metric="requestRate"
          timeRange={timeRanges.requestRate}
          onTimeRangeChange={handleTimeRangeChange("requestRate")}
          color="var(--dh-color-ops-accent, #60a5fa)"
        />
        <SparklineWidget
          title="Runner Risk Rate"
          metric="errorRate"
          timeRange={timeRanges.errorRate}
          onTimeRangeChange={handleTimeRangeChange("errorRate")}
          color="var(--dh-color-danger, #ef4444)"
        />
        <SparklineWidget
          title="P95 Execution"
          metric="p95Latency"
          timeRange={timeRanges.p95Latency}
          onTimeRangeChange={handleTimeRangeChange("p95Latency")}
          color="var(--dh-color-warning, #f59e0b)"
        />
        <SparklineWidget
          title="Runner Queue"
          metric="cpuUtilization"
          timeRange={timeRanges.cpuUtilization}
          onTimeRangeChange={handleTimeRangeChange("cpuUtilization")}
          color="var(--dh-color-success, #10b981)"
        />
      </div>
    </section>
  );
}

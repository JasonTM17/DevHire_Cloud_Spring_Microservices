"use client";

import { useDataFetcher } from "@/hooks/useDataFetcher";
import { api } from "@/lib/api";
import { buildOpsHealthSummary, computeOverallHealth, unknownOpsHealthSummary } from "@/lib/ops";
import type { OpsHealthSummary } from "@/lib/ops";
import type { ServiceStatus } from "@/lib/ops/types";
import "@/styles/components/ops-global-status-bar.css";

export interface OpsGlobalStatusBarProps {
  data?: OpsHealthSummary;
}

const PENDING_REFRESH_AT = "1970-01-01T00:00:00.000Z";

function HealthPill({ status }: { status: ServiceStatus }) {
  const labels: Record<ServiceStatus, string> = {
    healthy: "Healthy",
    degraded: "Degraded",
    critical: "Critical",
    unknown: "Awaiting signal",
  };

  return (
    <span
      className={`ops-status-pill ops-status-pill--${status}`}
      role="status"
      aria-label={`Overall system health: ${labels[status]}`}
      data-testid="ops-health-pill"
    >
      <span className="ops-status-pill__dot" aria-hidden="true" />
      <span className="ops-status-pill__label">{labels[status]}</span>
    </span>
  );
}

export function OpsGlobalStatusBar({ data: overrideData }: OpsGlobalStatusBarProps) {
  const { data: fetchedData, isValidating } = useDataFetcher<OpsHealthSummary>(
    overrideData ? null : "ops:global-health",
    async () => {
      try {
        const [operations, codeAssessments] = await Promise.all([
          api.operationsSummary(),
          api.codeAssessmentSummary(),
        ]);
        return buildOpsHealthSummary(operations, codeAssessments);
      } catch (error) {
        return unknownOpsHealthSummary(error instanceof Error ? error.message : "Admin health APIs unavailable");
      }
    },
    { refreshInterval: 30_000, pauseWhenHidden: true }
  );

  const summary = overrideData
    ?? fetchedData
    ?? unknownOpsHealthSummary("Waiting for the first admin health poll.", PENDING_REFRESH_AT);
  const overallHealth = computeOverallHealth(summary.services);

  return (
    <div className="ops-global-status-bar" data-testid="ops-global-status-bar">
      <HealthPill status={overallHealth} />

      <div className="ops-global-status-bar__incidents">
        <span className="ops-global-status-bar__incidents-count">
          {summary.activeIncidents}
        </span>
        <span className="ops-global-status-bar__incidents-label">
          {summary.activeIncidents === 1 ? "Active Incident" : "Active Incidents"}
        </span>
      </div>

      <div className="ops-global-status-bar__refresh">
        <span className="ops-global-status-bar__refresh-label">Last refresh:</span>
        <time
          className="ops-global-status-bar__refresh-time"
          dateTime={summary.lastRefresh}
        >
          {formatRefreshTime(summary.lastRefresh)}
        </time>
        {isValidating && (
          <span
            className="ops-global-status-bar__loading"
            aria-label="Refreshing data"
          >
            ...
          </span>
        )}
      </div>
    </div>
  );
}

function formatRefreshTime(isoString: string): string {
  if (isoString === PENDING_REFRESH_AT) {
    return "pending";
  }
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

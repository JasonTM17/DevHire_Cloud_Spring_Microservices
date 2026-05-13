"use client";

import { useDataFetcher } from "@/hooks/useDataFetcher";
import { computeOverallHealth } from "@/lib/ops/classifiers";
import type { ServiceHealth, ServiceStatus } from "@/lib/ops/types";
import "@/styles/components/ops-global-status-bar.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OperationsSummary {
  services: ServiceHealth[];
  activeIncidents: number;
  lastRefresh: string;
}

export interface OpsGlobalStatusBarProps {
  /** Override data for testing (bypasses useDataFetcher) */
  data?: OperationsSummary;
}

// ─── Health Pill ─────────────────────────────────────────────────────────────

function HealthPill({ status }: { status: ServiceStatus }) {
  const labels: Record<ServiceStatus, string> = {
    healthy: "Healthy",
    degraded: "Degraded",
    critical: "Critical",
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

// ─── OpsGlobalStatusBar ──────────────────────────────────────────────────────

/**
 * OpsGlobalStatusBar — Displays overall platform health, active incident count,
 * and last-refresh timestamp.
 *
 * Data fetched from operations summary endpoint with 30s polling interval,
 * paused when the browser tab is hidden.
 *
 * Requirements: 6.5
 */
export function OpsGlobalStatusBar({ data: overrideData }: OpsGlobalStatusBarProps) {
  const { data: fetchedData, isValidating } = useDataFetcher<OperationsSummary>(
    overrideData ? null : "/api/operations/summary",
    () =>
      fetch("/api/operations/summary").then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    { refreshInterval: 30_000, pauseWhenHidden: true }
  );

  const summary = overrideData ?? fetchedData;

  const overallHealth: ServiceStatus = summary
    ? computeOverallHealth(summary.services)
    : "healthy";

  const activeIncidents = summary?.activeIncidents ?? 0;
  const lastRefresh = summary?.lastRefresh
    ? formatRefreshTime(summary.lastRefresh)
    : "—";

  return (
    <div className="ops-global-status-bar" data-testid="ops-global-status-bar">
      <HealthPill status={overallHealth} />

      <div className="ops-global-status-bar__incidents">
        <span className="ops-global-status-bar__incidents-count">
          {activeIncidents}
        </span>
        <span className="ops-global-status-bar__incidents-label">
          {activeIncidents === 1 ? "Active Incident" : "Active Incidents"}
        </span>
      </div>

      <div className="ops-global-status-bar__refresh">
        <span className="ops-global-status-bar__refresh-label">
          Last refresh:
        </span>
        <time
          className="ops-global-status-bar__refresh-time"
          dateTime={summary?.lastRefresh}
        >
          {lastRefresh}
        </time>
        {isValidating && (
          <span
            className="ops-global-status-bar__loading"
            aria-label="Refreshing data"
          >
            ⟳
          </span>
        )}
      </div>
    </div>
  );
}

/** Format ISO timestamp to a short time display */
function formatRefreshTime(isoString: string): string {
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

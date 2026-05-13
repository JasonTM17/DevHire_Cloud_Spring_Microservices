"use client";

import { Drawer } from "@/components/ui/overlays/Drawer";
import { VirtualList } from "@/components/ui/data-display";
import { StatusDot } from "@/components/ui/data-display";
import type { ServiceHealth } from "@/lib/ops/types";
import "@/styles/components/service-detail-drawer.css";

/** Detailed metrics for a service shown in the drawer */
export interface ServiceDetailMetrics {
  /** JVM heap usage in MB */
  jvmHeapUsedMb: number;
  /** JVM heap max in MB */
  jvmHeapMaxMb: number;
  /** Active thread count */
  threadCount: number;
  /** GC collections per minute */
  gcFrequencyPerMin: number;
  /** Recent error log entries */
  recentErrors: ErrorLogEntry[];
}

export interface ErrorLogEntry {
  /** ISO timestamp */
  timestamp: string;
  /** Log level */
  level: "ERROR" | "WARN";
  /** Error message */
  message: string;
  /** Optional stack trace (first line) */
  stackTrace?: string;
}

export interface ServiceDetailDrawerProps {
  /** The service to show details for (null = closed) */
  service: ServiceHealth | null;
  /** Detailed metrics for the selected service */
  details?: ServiceDetailMetrics | null;
  /** Whether detail metrics are loading */
  isLoading?: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
}

const ERROR_LOG_ITEM_HEIGHT = 64;

/**
 * ServiceDetailDrawer — Slide-in panel showing detailed metrics for a service.
 *
 * Displays JVM heap usage, thread count, GC frequency, and recent error logs.
 * Error logs are virtualized when > 50 entries for performance.
 *
 * Requirements: 7.5, 10.6
 */
export function ServiceDetailDrawer({
  service,
  details,
  isLoading = false,
  onClose,
}: ServiceDetailDrawerProps) {
  const isOpen = service !== null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={service ? `${service.name} Details` : "Service Details"}
      position="right"
      className="dh-service-detail-drawer"
      data-testid="service-detail-drawer"
    >
      {service && (
        <div className="dh-service-detail">
          {/* Service status summary */}
          <div className="dh-service-detail__status">
            <StatusDot status={service.status} size="lg" />
            <div className="dh-service-detail__status-info">
              <span className="dh-service-detail__service-name">{service.name}</span>
              <span className={`dh-service-detail__status-label dh-service-detail__status-label--${service.status}`}>
                {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Basic metrics from health snapshot */}
          <div className="dh-service-detail__section">
            <h4 className="dh-service-detail__section-title">Health Metrics</h4>
            <div className="dh-service-detail__metrics-grid">
              <MetricItem label="Response Time" value={`${service.responseTimeMs}ms`} />
              <MetricItem label="Uptime" value={`${service.uptimePercent.toFixed(2)}%`} />
              <MetricItem label="Last Check" value={formatTime(service.lastCheck)} />
            </div>
          </div>

          {/* Detailed JVM metrics */}
          {isLoading ? (
            <div className="dh-service-detail__loading" aria-label="Loading details">
              <div className="dh-service-detail__skeleton" />
              <div className="dh-service-detail__skeleton dh-service-detail__skeleton--short" />
              <div className="dh-service-detail__skeleton" />
            </div>
          ) : details ? (
            <>
              <div className="dh-service-detail__section">
                <h4 className="dh-service-detail__section-title">JVM Metrics</h4>
                <div className="dh-service-detail__metrics-grid">
                  <MetricItem
                    label="Heap Usage"
                    value={`${details.jvmHeapUsedMb}MB / ${details.jvmHeapMaxMb}MB`}
                    highlight={details.jvmHeapUsedMb / details.jvmHeapMaxMb > 0.85}
                  />
                  <MetricItem
                    label="Threads"
                    value={`${details.threadCount}`}
                    highlight={details.threadCount > 200}
                  />
                  <MetricItem
                    label="GC Frequency"
                    value={`${details.gcFrequencyPerMin}/min`}
                    highlight={details.gcFrequencyPerMin > 10}
                  />
                </div>
              </div>

              {/* Error logs */}
              <div className="dh-service-detail__section">
                <h4 className="dh-service-detail__section-title">
                  Recent Errors
                  {details.recentErrors.length > 0 && (
                    <span className="dh-service-detail__error-count">
                      ({details.recentErrors.length})
                    </span>
                  )}
                </h4>
                {details.recentErrors.length === 0 ? (
                  <p className="dh-service-detail__empty">No recent errors</p>
                ) : details.recentErrors.length > 50 ? (
                  <VirtualList
                    items={details.recentErrors}
                    itemHeight={ERROR_LOG_ITEM_HEIGHT}
                    renderItem={(entry) => <ErrorLogRow entry={entry} />}
                    className="dh-service-detail__error-list"
                    data-testid="service-error-list"
                  />
                ) : (
                  <div className="dh-service-detail__error-list--static">
                    {details.recentErrors.map((entry, idx) => (
                      <ErrorLogRow key={`${entry.timestamp}-${idx}`} entry={entry} />
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </Drawer>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`dh-service-detail__metric${highlight ? " dh-service-detail__metric--highlight" : ""}`}>
      <span className="dh-service-detail__metric-label">{label}</span>
      <span className="dh-service-detail__metric-value">{value}</span>
    </div>
  );
}

function ErrorLogRow({ entry }: { entry: ErrorLogEntry }) {
  return (
    <div className={`dh-service-detail__error-row dh-service-detail__error-row--${entry.level.toLowerCase()}`}>
      <div className="dh-service-detail__error-header">
        <span className="dh-service-detail__error-level">{entry.level}</span>
        <span className="dh-service-detail__error-time">{formatTime(entry.timestamp)}</span>
      </div>
      <p className="dh-service-detail__error-message">{entry.message}</p>
      {entry.stackTrace && (
        <code className="dh-service-detail__error-stack">{entry.stackTrace}</code>
      )}
    </div>
  );
}

function formatTime(isoString: string): string {
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

"use client";

import { StatusDot } from "@/components/ui/data-display";
import type { ServiceHealth, ServiceTransition } from "@/lib/ops/types";
import "@/styles/components/service-health.css";

export interface ServiceHealthMatrixProps {
  /** Array of service health snapshots */
  services: ServiceHealth[];
  /** Optional transition timeline entries */
  transitions?: ServiceTransition[];
  /** Callback when a service card is clicked (opens detail drawer) */
  onServiceClick?: (service: ServiceHealth) => void;
}

/**
 * ServiceHealthMatrix — Grid of service health cards for OPS Dashboard.
 *
 * Displays a card per service showing status dot, name, response time,
 * uptime percentage, and last health check timestamp.
 * Unhealthy services get a red border + pulsing indicator.
 * Clicking a card triggers onServiceClick for opening the detail drawer.
 *
 * Requirements: 7.1, 7.2
 */
export function ServiceHealthMatrix({
  services,
  transitions = [],
  onServiceClick,
}: ServiceHealthMatrixProps) {
  return (
    <div className="dh-service-health-matrix" data-testid="service-health-matrix">
      {services.map((service) => {
        const isUnhealthy = service.status === "critical" || service.status === "degraded";
        const cardClasses = [
          "dh-service-card",
          isUnhealthy && "dh-service-card--unhealthy",
          onServiceClick && "dh-service-card--clickable",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <article
            key={service.name}
            className={cardClasses}
            aria-label={`${service.name} service health`}
            data-testid={`service-card-${service.name}`}
            onClick={() => onServiceClick?.(service)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onServiceClick?.(service);
              }
            }}
            role={onServiceClick ? "button" : undefined}
            tabIndex={onServiceClick ? 0 : undefined}
          >
            {isUnhealthy && <div className="dh-service-card__indicator" />}
            <div className="dh-service-card__header">
              <StatusDot
                status={service.status === "critical" ? "critical" : service.status === "degraded" ? "degraded" : "healthy"}
                size="md"
              />
              <h3 className="dh-service-card__name">{service.name}</h3>
            </div>

            <div className="dh-service-card__metrics">
              <div className="dh-service-card__metric">
                <span className="dh-service-card__metric-label">Response</span>
                <span className="dh-service-card__metric-value">
                  {service.responseTimeMs}ms
                </span>
              </div>
              <div className="dh-service-card__metric">
                <span className="dh-service-card__metric-label">Uptime</span>
                <span className="dh-service-card__metric-value">
                  {service.uptimePercent.toFixed(2)}%
                </span>
              </div>
              <div className="dh-service-card__metric">
                <span className="dh-service-card__metric-label">Last Check</span>
                <span className="dh-service-card__metric-value">
                  {formatLastCheck(service.lastCheck)}
                </span>
              </div>
            </div>
          </article>
        );
      })}

      {transitions.length > 0 && (
        <div className="dh-transition-timeline" data-testid="transition-timeline">
          <h4 className="dh-transition-timeline__title">Recent Transitions</h4>
          {transitions.map((t, idx) => (
            <div
              key={`${t.serviceName}-${t.timestamp}-${idx}`}
              className="dh-transition-timeline__item"
            >
              <span className="dh-transition-timeline__service-name">
                {t.serviceName}
              </span>
              <span className={`dh-transition-timeline__status--${t.from}`}>
                {t.from}
              </span>
              <span className="dh-transition-timeline__arrow">→</span>
              <span className={`dh-transition-timeline__status--${t.to}`}>
                {t.to}
              </span>
              <span className="dh-transition-timeline__timestamp">
                {formatTimestamp(t.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Format ISO timestamp to a short relative/time display */
function formatLastCheck(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}

/** Format transition timestamp */
function formatTimestamp(isoString: string): string {
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

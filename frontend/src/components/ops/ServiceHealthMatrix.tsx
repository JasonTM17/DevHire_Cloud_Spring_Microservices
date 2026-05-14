"use client";

import { StatusDot } from "@/components/ui/data-display";
import type { ServiceHealth, ServiceTransition } from "@/lib/ops/types";
import "@/styles/components/service-health.css";

export interface ServiceHealthMatrixProps {
  services: ServiceHealth[];
  transitions?: ServiceTransition[];
  onServiceClick?: (service: ServiceHealth) => void;
}

export function ServiceHealthMatrix({
  services,
  transitions = [],
  onServiceClick,
}: ServiceHealthMatrixProps) {
  return (
    <div className="dh-service-health-matrix" data-testid="service-health-matrix">
      {services.map((service) => {
        const isUnhealthy = service.status === "critical" || service.status === "degraded";
        const isUnknown = service.status === "unknown";
        const cardClasses = [
          "dh-service-card",
          isUnhealthy && "dh-service-card--unhealthy",
          isUnknown && "dh-service-card--unknown",
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
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onServiceClick?.(service);
              }
            }}
            role={onServiceClick ? "button" : undefined}
            tabIndex={onServiceClick ? 0 : undefined}
          >
            {isUnhealthy && <div className="dh-service-card__indicator" />}
            <div className="dh-service-card__header">
              <StatusDot status={service.status} size="md" />
              <h3 className="dh-service-card__name">{service.name}</h3>
            </div>

            <div className="dh-service-card__metrics">
              <Metric label="Response" value={formatMilliseconds(service.responseTimeMs)} />
              <Metric label="Uptime" value={formatPercent(service.uptimePercent)} />
              <Metric label="Last Check" value={formatLastCheck(service.lastCheck)} />
              <Metric label="Source" value={service.source ?? "Admin health synthesis"} />
            </div>

            {service.detail && (
              <p className="dh-service-card__detail">{service.detail}</p>
            )}
          </article>
        );
      })}

      {transitions.length > 0 && (
        <div className="dh-transition-timeline" data-testid="transition-timeline">
          <h4 className="dh-transition-timeline__title">Recent Transitions</h4>
          {transitions.map((transition, index) => (
            <div
              key={`${transition.serviceName}-${transition.timestamp}-${index}`}
              className="dh-transition-timeline__item"
            >
              <span className="dh-transition-timeline__service-name">
                {transition.serviceName}
              </span>
              <span className={`dh-transition-timeline__status--${transition.from}`}>
                {transition.from}
              </span>
              <span className="dh-transition-timeline__arrow">-&gt;</span>
              <span className={`dh-transition-timeline__status--${transition.to}`}>
                {transition.to}
              </span>
              <span className="dh-transition-timeline__timestamp">
                {formatTimestamp(transition.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="dh-service-card__metric">
      <span className="dh-service-card__metric-label">{label}</span>
      <span className="dh-service-card__metric-value">{value}</span>
    </div>
  );
}

function formatMilliseconds(value?: number): string {
  return typeof value === "number" ? `${Math.round(value)}ms` : "n/a";
}

function formatPercent(value?: number): string {
  return typeof value === "number" ? `${value.toFixed(2)}%` : "n/a";
}

function formatLastCheck(isoString: string): string {
  if (isoString === "1970-01-01T00:00:00.000Z") {
    return "pending";
  }
  try {
    const date = new Date(isoString);
    const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (Number.isNaN(diffSeconds)) return isoString;
    if (diffSeconds < 60) return `${Math.max(diffSeconds, 0)}s ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return isoString;
  }
}

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

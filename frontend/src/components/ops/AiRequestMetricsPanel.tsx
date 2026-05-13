"use client";

import { Card } from "@/components/ui/layout/Card";
import { Badge } from "@/components/ui/primitives/Badge";
import { ProgressBar } from "@/components/ui/primitives/ProgressBar";

export type MetricsTimeRange = "1h" | "6h" | "24h";

export interface AiTokenUsage {
  input: number;
  output: number;
}

export interface AiRequestMetrics {
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  tokenUsage: AiTokenUsage;
}

export interface AiRequestMetricsPanelProps {
  metrics: AiRequestMetrics;
  timeRange: MetricsTimeRange;
  onTimeRangeChange: (range: MetricsTimeRange) => void;
  "data-testid"?: string;
}

const TIME_RANGE_OPTIONS: { value: MetricsTimeRange; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
];

function getSuccessRateVariant(rate: number) {
  if (rate >= 95) return "success";
  if (rate >= 80) return "warning";
  return "danger";
}

/**
 * AiRequestMetricsPanel — Displays AI request metrics including
 * total requests, success rate, average latency, and token usage.
 * Includes a time range selector for filtering the metrics window.
 *
 * Requirements: 8.5
 */
export function AiRequestMetricsPanel({
  metrics,
  timeRange,
  onTimeRangeChange,
  "data-testid": testId,
}: AiRequestMetricsPanelProps) {
  return (
    <Card
      variant="outlined"
      padding="md"
      data-testid={testId ?? "ai-request-metrics-panel"}
    >
      <div className="dh-ai-metrics-panel">
        <div className="dh-ai-metrics-panel__header">
          <h3 className="dh-ai-metrics-panel__title">Request Metrics</h3>
          <div
            className="dh-ai-metrics-panel__time-range"
            role="group"
            aria-label="Time range selector"
          >
            {TIME_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`dh-ai-metrics-panel__range-btn${
                  timeRange === option.value
                    ? " dh-ai-metrics-panel__range-btn--active"
                    : ""
                }`}
                onClick={() => onTimeRangeChange(option.value)}
                aria-pressed={timeRange === option.value}
                data-testid={`time-range-${option.value}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="dh-ai-metrics-panel__grid">
          <div className="dh-ai-metrics-panel__stat">
            <span className="dh-ai-metrics-panel__stat-label">
              Total Requests
            </span>
            <span
              className="dh-ai-metrics-panel__stat-value"
              data-testid="total-requests"
            >
              {metrics.totalRequests.toLocaleString()}
            </span>
          </div>

          <div className="dh-ai-metrics-panel__stat">
            <span className="dh-ai-metrics-panel__stat-label">
              Success Rate
            </span>
            <span
              className="dh-ai-metrics-panel__stat-value"
              data-testid="success-rate"
            >
              <ProgressBar
                value={metrics.successRate}
                max={100}
                variant={getSuccessRateVariant(metrics.successRate)}
                size="sm"
                showValue
                aria-label="Success rate"
              />
            </span>
          </div>

          <div className="dh-ai-metrics-panel__stat">
            <span className="dh-ai-metrics-panel__stat-label">
              Avg Latency
            </span>
            <span
              className="dh-ai-metrics-panel__stat-value"
              data-testid="avg-latency"
            >
              {metrics.avgLatencyMs.toLocaleString()} ms
            </span>
          </div>

          <div className="dh-ai-metrics-panel__stat dh-ai-metrics-panel__stat--tokens">
            <span className="dh-ai-metrics-panel__stat-label">
              Token Usage
            </span>
            <div
              className="dh-ai-metrics-panel__token-usage"
              data-testid="token-usage"
            >
              <Badge variant="info" size="sm">
                In: {metrics.tokenUsage.input.toLocaleString()}
              </Badge>
              <Badge variant="default" size="sm">
                Out: {metrics.tokenUsage.output.toLocaleString()}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

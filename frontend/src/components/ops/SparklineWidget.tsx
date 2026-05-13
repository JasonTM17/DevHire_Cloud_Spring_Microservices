"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkline } from "@/components/ui/data-display";
import {
  bucketPoints,
  type MetricName,
  type TimeRange,
} from "@/lib/opsSparklineBuffer";
import "@/styles/components/sparkline-widget.css";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SparklineWidgetProps {
  /** Widget title displayed above the sparkline */
  title: string;
  /** Metric key to read from the sparkline buffer */
  metric: MetricName;
  /** Currently selected time range */
  timeRange: TimeRange;
  /** Callback when user changes the time range */
  onTimeRangeChange: (range: TimeRange) => void;
  /** Optional stroke color for the sparkline line */
  color?: string;
  /** Optional test id */
  "data-testid"?: string;
}

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "30m", label: "30m" },
  { value: "1h", label: "1h" },
  { value: "2h", label: "2h" },
];

// ─── TimeRangeToggle ─────────────────────────────────────────────────────────

function TimeRangeToggle({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div
      className="dh-sparkline-widget__time-range"
      role="group"
      aria-label="Time range selector"
    >
      {TIME_RANGE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`dh-sparkline-widget__range-btn${
            value === option.value
              ? " dh-sparkline-widget__range-btn--active"
              : ""
          }`}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ─── SparklineWidget ─────────────────────────────────────────────────────────

/**
 * SparklineWidget — Wrapper around the Sparkline primitive with a title
 * and TimeRangeToggle. Reads data from the module-scoped opsSparklineBuffer.
 *
 * Displays "No telemetry yet" when the buffer is empty for the selected range.
 *
 * Requirements: 6.6
 */
export function SparklineWidget({
  title,
  metric,
  timeRange,
  onTimeRangeChange,
  color,
  "data-testid": testId,
}: SparklineWidgetProps) {
  const [points, setPoints] = useState<number[]>([]);

  const refreshPoints = useCallback(() => {
    const now = Date.now();
    const dataPoints = bucketPoints(metric, timeRange, now);
    setPoints(dataPoints.map((dp) => dp.value));
  }, [metric, timeRange]);

  // Refresh points on mount, when metric/timeRange changes, and every 30s
  useEffect(() => {
    refreshPoints();

    const interval = setInterval(refreshPoints, 30_000);
    return () => clearInterval(interval);
  }, [refreshPoints]);

  const isEmpty = points.length === 0;

  return (
    <div
      className="dh-sparkline-widget"
      data-testid={testId ?? `sparkline-widget-${metric}`}
    >
      <div className="dh-sparkline-widget__header">
        <h4 className="dh-sparkline-widget__title">{title}</h4>
        <TimeRangeToggle value={timeRange} onChange={onTimeRangeChange} />
      </div>

      <div className="dh-sparkline-widget__body">
        {isEmpty ? (
          <p className="dh-sparkline-widget__empty" aria-live="polite">
            No telemetry yet
          </p>
        ) : (
          <Sparkline
            points={points}
            width={280}
            height={56}
            ariaLabel={`${title} sparkline for last ${timeRange}`}
            color={color}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { classifyLag } from "@/lib/ops/classifiers";
import type { LagClassification } from "@/lib/ops/types";

export interface KafkaConsumerGroup {
  /** Consumer group name */
  name: string;
  /** Current consumer lag value */
  lag: number;
}

export interface KafkaConsumerLagPanelProps {
  /** Array of consumer groups with their lag values */
  groups: KafkaConsumerGroup[];
}

const lagLabels: Record<LagClassification, string> = {
  green: "Healthy",
  yellow: "Warning",
  red: "Critical",
};

/**
 * KafkaConsumerLagPanel — Displays per-consumer-group lag with color-coded dots.
 *
 * Uses `classifyLag` from @/lib/ops/classifiers to determine dot color:
 * - green:  lag < 1000
 * - yellow: 1000 <= lag < 10000
 * - red:    lag >= 10000
 *
 * Requirements: 7.3
 */
export function KafkaConsumerLagPanel({ groups }: KafkaConsumerLagPanelProps) {
  return (
    <div className="dh-kafka-lag-panel" data-testid="kafka-consumer-lag-panel">
      <h3 className="dh-kafka-lag-panel__title">Kafka Consumer Lag</h3>
      {groups.map((group) => {
        const classification = classifyLag(group.lag);
        return (
          <div
            key={group.name}
            className="dh-kafka-lag-group"
            data-testid={`kafka-lag-group-${group.name}`}
          >
            <div className="dh-kafka-lag-group__info">
              <span
                className={`dh-kafka-lag-dot dh-kafka-lag-dot--${classification}`}
                role="img"
                aria-label={lagLabels[classification]}
              />
              <span className="dh-kafka-lag-group__name">{group.name}</span>
            </div>
            <span className="dh-kafka-lag-group__value">
              {formatLag(group.lag)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Format lag value with locale-aware number formatting */
function formatLag(lag: number): string {
  if (lag >= 1_000_000) {
    return `${(lag / 1_000_000).toFixed(1)}M`;
  }
  if (lag >= 10_000) {
    return `${(lag / 1_000).toFixed(1)}K`;
  }
  return lag.toLocaleString();
}

"use client";

import { ProgressBar } from "@/components/ui/primitives/ProgressBar";
import { classifyPoolUtilization } from "@/lib/ops/classifiers";
import type { PoolUtilizationClassification } from "@/lib/ops/types";

export interface HikariPool {
  /** Pool name (e.g. service name or datasource identifier) */
  name: string;
  /** Utilization as a decimal (0.0 - 1.0) */
  utilization: number;
}

export interface HikariPoolPanelProps {
  /** Array of connection pools with their utilization */
  pools: HikariPool[];
}

const classificationLabels: Record<PoolUtilizationClassification, string> = {
  normal: "Normal",
  warning: "Warning",
  critical: "Critical",
};

const classificationVariants: Record<PoolUtilizationClassification, "success" | "warning" | "danger"> = {
  normal: "success",
  warning: "warning",
  critical: "danger",
};

/**
 * HikariPoolPanel — Displays HikariCP connection pool utilization with threshold markers.
 *
 * Each pool shows a ProgressBar with threshold markers at 70% (warning) and 85% (critical).
 * Classification label is determined by `classifyPoolUtilization` from @/lib/ops/classifiers:
 * - normal:   utilization < 0.70
 * - warning:  0.70 <= utilization < 0.85
 * - critical: utilization >= 0.85
 *
 * Requirements: 7.4
 */
export function HikariPoolPanel({ pools }: HikariPoolPanelProps) {
  return (
    <div className="dh-hikari-pool-panel" data-testid="hikari-pool-panel">
      <h3 className="dh-hikari-pool-panel__title">HikariCP Pool Utilization</h3>
      {pools.map((pool) => {
        const classification = classifyPoolUtilization(pool.utilization);
        const percentage = Math.round(pool.utilization * 100);

        return (
          <div
            key={pool.name}
            className="dh-hikari-pool-item"
            data-testid={`hikari-pool-${pool.name}`}
          >
            <div className="dh-hikari-pool-item__header">
              <span className="dh-hikari-pool-item__name">{pool.name}</span>
              <span
                className={`dh-hikari-pool-item__classification dh-hikari-pool-item__classification--${classification}`}
              >
                {classificationLabels[classification]}
              </span>
            </div>
            <ProgressBar
              value={percentage}
              max={100}
              variant={classificationVariants[classification]}
              size="md"
              showValue
              markers={[70, 85]}
              aria-label={`${pool.name} pool utilization: ${percentage}%`}
            />
          </div>
        );
      })}
    </div>
  );
}

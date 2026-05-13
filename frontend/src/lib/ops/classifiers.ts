/**
 * Pure classifiers and aggregators for OPS Dashboard health monitoring.
 *
 * All functions are pure: no side effects, no external dependencies.
 */

import type {
  ServiceHealth,
  ServiceStatus,
  ServiceTransition,
  LagClassification,
  PoolUtilizationClassification,
} from './types.ts';

export type {
  ServiceHealth,
  ServiceStatus,
  ServiceTransition,
  LagClassification,
  PoolUtilizationClassification,
} from './types.ts';

/**
 * Classify Kafka consumer lag by color-coded thresholds.
 *
 * - green:  lag < 1000
 * - yellow: 1000 <= lag < 10000
 * - red:    lag >= 10000
 */
export function classifyLag(lag: number): LagClassification {
  if (lag < 1000) return 'green';
  if (lag < 10000) return 'yellow';
  return 'red';
}

/**
 * Classify HikariCP connection pool utilization.
 *
 * - normal:   utilization < 0.70
 * - warning:  0.70 <= utilization < 0.85
 * - critical: utilization >= 0.85
 */
export function classifyPoolUtilization(utilization: number): PoolUtilizationClassification {
  if (utilization < 0.7) return 'normal';
  if (utilization < 0.85) return 'warning';
  return 'critical';
}

/**
 * Compute overall platform health from service health statuses.
 *
 * - If any service is critical -> 'critical'
 * - If any service is degraded -> 'degraded'
 * - If there is no live service signal or any service is unknown -> 'unknown'
 * - Otherwise -> 'healthy'
 */
export function computeOverallHealth(services: ServiceHealth[]): ServiceStatus {
  if (services.some((s) => s.status === 'critical')) return 'critical';
  if (services.some((s) => s.status === 'degraded')) return 'degraded';
  if (services.length === 0 || services.some((s) => s.status === 'unknown')) return 'unknown';
  return 'healthy';
}

/**
 * Detect service status transitions between two snapshots.
 */
export function detectTransitions(
  oldServices: ServiceHealth[],
  newServices: ServiceHealth[]
): ServiceTransition[] {
  const oldMap = new Map<string, ServiceStatus>();
  for (const service of oldServices) {
    oldMap.set(service.name, service.status);
  }

  const transitions: ServiceTransition[] = [];
  const now = new Date().toISOString();

  for (const service of newServices) {
    const oldStatus = oldMap.get(service.name);
    if (oldStatus !== undefined && oldStatus !== service.status) {
      transitions.push({
        serviceName: service.name,
        from: oldStatus,
        to: service.status,
        timestamp: now,
      });
    }
  }

  return transitions;
}

/**
 * Determine if fetched data is stale based on a time threshold.
 */
export function isStale(
  fetchedAt: number,
  now: number,
  thresholdMs: number = 60_000
): boolean {
  return now - fetchedAt > thresholdMs;
}

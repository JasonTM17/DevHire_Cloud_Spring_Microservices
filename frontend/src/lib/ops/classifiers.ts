/**
 * Pure classifiers and aggregators for OPS Dashboard health monitoring.
 *
 * All functions are pure — no side effects, no external dependencies.
 */

import type {
  ServiceHealth,
  ServiceStatus,
  ServiceTransition,
  LagClassification,
  PoolUtilizationClassification,
} from './types.ts';

// Re-export types for backward compatibility
export type {
  ServiceHealth,
  ServiceStatus,
  ServiceTransition,
  LagClassification,
  PoolUtilizationClassification,
} from './types.ts';

// ─── Classifiers ─────────────────────────────────────────────────────────────

/**
 * Classify Kafka consumer lag by color-coded thresholds.
 *
 * - green:  lag < 1000
 * - yellow: 1000 <= lag < 10000
 * - red:    lag >= 10000
 *
 * Validates: Requirements 7.3
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
 *
 * Validates: Requirements 7.4
 */
export function classifyPoolUtilization(utilization: number): PoolUtilizationClassification {
  if (utilization < 0.7) return 'normal';
  if (utilization < 0.85) return 'warning';
  return 'critical';
}

// ─── Aggregators ─────────────────────────────────────────────────────────────

/**
 * Compute overall platform health from a list of service health statuses.
 *
 * - If any service is critical → 'critical'
 * - If any service is degraded → 'degraded'
 * - Otherwise → 'healthy'
 *
 * Validates: Requirements 6.3
 */
export function computeOverallHealth(services: ServiceHealth[]): ServiceStatus {
  if (services.some((s) => s.status === 'critical')) return 'critical';
  if (services.some((s) => s.status === 'degraded')) return 'degraded';
  return 'healthy';
}

/**
 * Detect service status transitions between two snapshots.
 *
 * Compares old vs new services by name and returns an array of services
 * whose status changed, with the transition details.
 *
 * Validates: Requirements 7.2
 */
export function detectTransitions(
  oldServices: ServiceHealth[],
  newServices: ServiceHealth[]
): ServiceTransition[] {
  const oldMap = new Map<string, ServiceStatus>();
  for (const s of oldServices) {
    oldMap.set(s.name, s.status);
  }

  const transitions: ServiceTransition[] = [];
  const now = new Date().toISOString();

  for (const s of newServices) {
    const oldStatus = oldMap.get(s.name);
    if (oldStatus !== undefined && oldStatus !== s.status) {
      transitions.push({
        serviceName: s.name,
        from: oldStatus,
        to: s.status,
        timestamp: now,
      });
    }
  }

  return transitions;
}

/**
 * Determine if fetched data is stale based on a time threshold.
 *
 * Returns true if `now - fetchedAt > thresholdMs`.
 * Default threshold: 60000ms (1 minute).
 *
 * Validates: Requirements 7.6, 11.5
 */
export function isStale(
  fetchedAt: number,
  now: number,
  thresholdMs: number = 60_000
): boolean {
  return now - fetchedAt > thresholdMs;
}

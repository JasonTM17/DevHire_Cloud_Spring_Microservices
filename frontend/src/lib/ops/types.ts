/**
 * Types for OPS Dashboard health monitoring.
 *
 * Requirements: 6.3, 7.2, 7.3, 7.4, 7.6, 11.5
 */

/** Possible health statuses for a service */
export type ServiceStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

/** Health snapshot for a single service */
export type ServiceHealth = {
  name: string;
  status: ServiceStatus;
  responseTimeMs?: number;
  uptimePercent?: number;
  lastCheck: string;
  source?: string;
  detail?: string;
};

/** Represents a status change for a service between two snapshots */
export type ServiceTransition = {
  serviceName: string;
  from: ServiceStatus;
  to: ServiceStatus;
  timestamp: string;
};

/** Kafka consumer lag color classification */
export type LagClassification = 'green' | 'yellow' | 'red';

/** HikariCP pool utilization classification */
export type PoolUtilizationClassification = 'normal' | 'warning' | 'critical';

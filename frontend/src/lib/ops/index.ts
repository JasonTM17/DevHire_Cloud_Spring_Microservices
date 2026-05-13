/**
 * OPS Dashboard pure classifiers, aggregators, and types.
 *
 * All exports are pure functions with no side effects.
 */

export {
  classifyLag,
  classifyPoolUtilization,
  computeOverallHealth,
  detectTransitions,
  isStale,
} from './classifiers.ts';

export {
  buildOpsHealthSummary,
  unknownOpsHealthSummary,
  runnerToServiceStatus,
} from './healthSignals';

export type { OpsHealthSummary } from './healthSignals';

export type {
  ServiceHealth,
  ServiceStatus,
  ServiceTransition,
  LagClassification,
  PoolUtilizationClassification,
} from './types.ts';

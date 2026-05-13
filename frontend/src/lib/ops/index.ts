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

export type {
  ServiceHealth,
  ServiceStatus,
  ServiceTransition,
  LagClassification,
  PoolUtilizationClassification,
} from './types.ts';

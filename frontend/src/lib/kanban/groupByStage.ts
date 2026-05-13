import type { Application, Stage } from './types';

/**
 * Groups applications by their stage field.
 * Ensures all provided stages have an entry (empty array if no apps in that stage).
 * Preserves insertion order within each stage.
 *
 * Pure function — no side effects.
 */
export function groupByStage(
  apps: Application[],
  stages: Stage[]
): Record<Stage, Application[]> {
  const result = {} as Record<Stage, Application[]>;

  // Initialize all stages with empty arrays
  for (const stage of stages) {
    result[stage] = [];
  }

  // Group applications into their respective stage buckets
  for (const app of apps) {
    if (result[app.stage] !== undefined) {
      result[app.stage].push(app);
    }
  }

  return result;
}

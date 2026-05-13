/**
 * Submission state machine for DevHire Cloud IDE.
 *
 * Models the lifecycle of a code submission:
 *   idle → compiling → running-visible → running-hidden → complete | failed
 *
 * Only forward transitions are allowed — backward transitions are rejected
 * (the reducer returns the current state unchanged).
 *
 * Requirements: 5.1, 11.3
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubmissionStep =
  | 'idle'
  | 'compiling'
  | 'running-visible'
  | 'running-hidden'
  | 'complete'
  | 'failed';

export type SubmissionEventType =
  | 'COMPILE_START'
  | 'VISIBLE_TESTS_START'
  | 'HIDDEN_TESTS_START'
  | 'COMPLETE'
  | 'FAIL';

export interface SubmissionEvent {
  type: SubmissionEventType;
}

// ---------------------------------------------------------------------------
// Constants (exported for property testing)
// ---------------------------------------------------------------------------

/**
 * Ordered steps representing the forward-only progression.
 * `failed` is a terminal state at the same level as `complete` (both are end states).
 */
export const STEP_ORDER: readonly SubmissionStep[] = [
  'idle',
  'compiling',
  'running-visible',
  'running-hidden',
  'complete',
] as const;

/**
 * Maps each event type to the target step it transitions to.
 */
const EVENT_TARGET: Record<SubmissionEventType, SubmissionStep> = {
  COMPILE_START: 'compiling',
  VISIBLE_TESTS_START: 'running-visible',
  HIDDEN_TESTS_START: 'running-hidden',
  COMPLETE: 'complete',
  FAIL: 'failed',
};

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns the ordinal index of a step in the progression.
 * `failed` is treated as equivalent to `complete` (both are terminal).
 */
function stepIndex(step: SubmissionStep): number {
  if (step === 'failed') return STEP_ORDER.length - 1; // same level as 'complete'
  const idx = STEP_ORDER.indexOf(step);
  return idx === -1 ? 0 : idx;
}

/**
 * Determines whether transitioning from `current` to `target` is a valid
 * forward transition. A transition is valid when:
 * - The target step has a higher ordinal than the current step, OR
 * - The target is 'failed' (failure can happen from any non-terminal state)
 *
 * Transitions FROM terminal states (complete, failed) are always rejected.
 */
function isForwardTransition(current: SubmissionStep, target: SubmissionStep): boolean {
  // Terminal states cannot transition further
  if (current === 'complete' || current === 'failed') {
    return false;
  }

  // 'failed' can be reached from any non-terminal state
  if (target === 'failed') {
    return true;
  }

  return stepIndex(target) > stepIndex(current);
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Pure reducer for submission step progression.
 * Returns the next state if the event represents a valid forward transition,
 * otherwise returns the current state unchanged (rejects backward transitions).
 */
export function submissionReducer(
  state: SubmissionStep,
  event: SubmissionEvent,
): SubmissionStep {
  const target = EVENT_TARGET[event.type];
  if (target === undefined) return state;

  if (isForwardTransition(state, target)) {
    return target;
  }

  // Reject backward or invalid transition
  return state;
}

// ---------------------------------------------------------------------------
// Progress mapping
// ---------------------------------------------------------------------------

/**
 * Maps a submission step to a progress percentage (0–100).
 *
 * - idle: 0%
 * - compiling: 25%
 * - running-visible: 50%
 * - running-hidden: 75%
 * - complete: 100%
 * - failed: percentage at which failure occurred (stays at last known progress)
 *
 * For simplicity, `failed` maps to the same value as the step before complete.
 */
export function stepToProgress(step: SubmissionStep): number {
  switch (step) {
    case 'idle':
      return 0;
    case 'compiling':
      return 25;
    case 'running-visible':
      return 50;
    case 'running-hidden':
      return 75;
    case 'complete':
      return 100;
    case 'failed':
      return 75;
    default:
      return 0;
  }
}

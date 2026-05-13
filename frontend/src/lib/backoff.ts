/**
 * Exponential backoff retry utility.
 *
 * delay = min(initialDelayMs * factor^(attempt-1), maxDelayMs)
 *
 * Requirements: 11.3
 */

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  factor: number;
  maxDelayMs: number;
  onAttempt?: (attempt: number, error: unknown) => void;
}

export interface RetryState {
  attempts: number;
  lastError: unknown | null;
  isRetrying: boolean;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute `fn` with exponential backoff retry.
 *
 * - On each failed attempt, waits `min(initialDelayMs * factor^(attempt-1), maxDelayMs)` before retrying.
 * - Calls `onAttempt(attempt, error)` after each failed attempt (1-indexed).
 * - Throws the last error if all attempts are exhausted.
 */
export async function runWithRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const { maxAttempts, initialDelayMs, factor, maxDelayMs, onAttempt } = opts;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (onAttempt) {
        onAttempt(attempt, error);
      }

      if (attempt < maxAttempts) {
        const backoffMs = Math.min(
          initialDelayMs * Math.pow(factor, attempt - 1),
          maxDelayMs,
        );
        await delay(backoffMs);
      }
    }
  }

  throw lastError;
}

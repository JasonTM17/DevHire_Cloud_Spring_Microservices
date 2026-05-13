/**
 * Unit tests for lib/backoff.ts - runWithRetry
 * Requirements: 11.3
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runWithRetry, type RetryOptions } from '../lib/backoff.ts';

describe('runWithRetry', () => {
  const baseOpts: RetryOptions = {
    maxAttempts: 3,
    initialDelayMs: 10,
    factor: 2,
    maxDelayMs: 100,
  };

  it('returns result on first success without retrying', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      return 'ok';
    };

    const result = await runWithRetry(fn, baseOpts);
    assert.equal(result, 'ok');
    assert.equal(callCount, 1);
  });

  it('retries on failure and returns result on eventual success', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount < 3) throw new Error(`fail ${callCount}`);
      return 'success';
    };

    const result = await runWithRetry(fn, baseOpts);
    assert.equal(result, 'success');
    assert.equal(callCount, 3);
  });

  it('throws last error when all attempts exhausted', async () => {
    let callCount = 0;
    const fn = async (): Promise<string> => {
      callCount++;
      throw new Error(`fail ${callCount}`);
    };

    await assert.rejects(
      () => runWithRetry(fn, baseOpts),
      (err: Error) => {
        assert.equal(err.message, 'fail 3');
        return true;
      },
    );
    assert.equal(callCount, 3);
  });

  it('calls onAttempt after each failed attempt', async () => {
    const attempts: Array<{ attempt: number; error: unknown }> = [];
    const fn = async (): Promise<string> => {
      throw new Error('always fail');
    };

    await assert.rejects(() =>
      runWithRetry(fn, {
        ...baseOpts,
        onAttempt: (attempt, error) => {
          attempts.push({ attempt, error });
        },
      }),
    );

    assert.equal(attempts.length, 3);
    assert.equal(attempts[0].attempt, 1);
    assert.equal(attempts[1].attempt, 2);
    assert.equal(attempts[2].attempt, 3);
  });

  it('does not call onAttempt on success', async () => {
    const attempts: number[] = [];
    const fn = async () => 'ok';

    await runWithRetry(fn, {
      ...baseOpts,
      onAttempt: (attempt) => {
        attempts.push(attempt);
      },
    });

    assert.equal(attempts.length, 0);
  });

  it('respects maxDelayMs cap', async () => {
    const start = Date.now();
    let callCount = 0;
    const fn = async (): Promise<string> => {
      callCount++;
      if (callCount < 3) throw new Error('fail');
      return 'ok';
    };

    // With factor=10 and initialDelayMs=50, uncapped delay would be 50, 500
    // But maxDelayMs=60 should cap the second delay
    await runWithRetry(fn, {
      maxAttempts: 3,
      initialDelayMs: 50,
      factor: 10,
      maxDelayMs: 60,
    });

    const elapsed = Date.now() - start;
    // First delay: min(50 * 10^0, 60) = 50ms
    // Second delay: min(50 * 10^1, 60) = 60ms
    // Total should be around 110ms, not 550ms
    assert.ok(elapsed >= 90, `Expected elapsed >= 90ms, got ${elapsed}ms`);
    assert.ok(elapsed < 500, `Expected elapsed < 500ms, got ${elapsed}ms`);
  });

  it('works with maxAttempts = 1 (no retry)', async () => {
    const fn = async (): Promise<string> => {
      throw new Error('single fail');
    };

    await assert.rejects(
      () => runWithRetry(fn, { ...baseOpts, maxAttempts: 1 }),
      (err: Error) => {
        assert.equal(err.message, 'single fail');
        return true;
      },
    );
  });

  it('applies exponential backoff delay formula correctly', async () => {
    const timestamps: number[] = [];
    let callCount = 0;
    const fn = async (): Promise<string> => {
      timestamps.push(Date.now());
      callCount++;
      if (callCount < 4) throw new Error('fail');
      return 'ok';
    };

    await runWithRetry(fn, {
      maxAttempts: 4,
      initialDelayMs: 20,
      factor: 2,
      maxDelayMs: 1000,
    });

    // Expected delays: 20ms (20*2^0), 40ms (20*2^1), 80ms (20*2^2)
    // Allow broad tolerance for CI timer scheduling and Windows process load.
    const gap1 = timestamps[1] - timestamps[0];
    const gap2 = timestamps[2] - timestamps[1];
    const gap3 = timestamps[3] - timestamps[2];

    assert.ok(gap1 >= 15 && gap1 <= 150, `gap1=${gap1}ms expected ~20ms`);
    assert.ok(gap2 >= 30 && gap2 <= 220, `gap2=${gap2}ms expected ~40ms`);
    assert.ok(gap3 >= 65 && gap3 <= 320, `gap3=${gap3}ms expected ~80ms`);
  });
});

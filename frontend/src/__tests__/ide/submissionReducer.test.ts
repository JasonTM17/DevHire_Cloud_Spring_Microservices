/**
 * Unit tests for lib/ide/submissionReducer.ts
 *
 * Tests cover: submissionReducer forward-only transitions, rejection of backward
 * transitions, terminal state behavior, STEP_ORDER, and stepToProgress mapping.
 *
 * Requirements: 5.1, 11.3
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import '../setup.ts';

import {
  submissionReducer,
  stepToProgress,
  STEP_ORDER,
  type SubmissionStep,
  type SubmissionEvent,
} from '../../lib/ide/submissionReducer.ts';

describe('submissionReducer', () => {
  describe('forward transitions', () => {
    it('transitions from idle to compiling on COMPILE_START', () => {
      const result = submissionReducer('idle', { type: 'COMPILE_START' });
      assert.equal(result, 'compiling');
    });

    it('transitions from compiling to running-visible on VISIBLE_TESTS_START', () => {
      const result = submissionReducer('compiling', { type: 'VISIBLE_TESTS_START' });
      assert.equal(result, 'running-visible');
    });

    it('transitions from running-visible to running-hidden on HIDDEN_TESTS_START', () => {
      const result = submissionReducer('running-visible', { type: 'HIDDEN_TESTS_START' });
      assert.equal(result, 'running-hidden');
    });

    it('transitions from running-hidden to complete on COMPLETE', () => {
      const result = submissionReducer('running-hidden', { type: 'COMPLETE' });
      assert.equal(result, 'complete');
    });

    it('allows skipping steps forward (idle → running-visible)', () => {
      const result = submissionReducer('idle', { type: 'VISIBLE_TESTS_START' });
      assert.equal(result, 'running-visible');
    });

    it('allows skipping steps forward (compiling → complete)', () => {
      const result = submissionReducer('compiling', { type: 'COMPLETE' });
      assert.equal(result, 'complete');
    });
  });

  describe('failure transitions', () => {
    it('transitions from idle to failed on FAIL', () => {
      const result = submissionReducer('idle', { type: 'FAIL' });
      assert.equal(result, 'failed');
    });

    it('transitions from compiling to failed on FAIL', () => {
      const result = submissionReducer('compiling', { type: 'FAIL' });
      assert.equal(result, 'failed');
    });

    it('transitions from running-visible to failed on FAIL', () => {
      const result = submissionReducer('running-visible', { type: 'FAIL' });
      assert.equal(result, 'failed');
    });

    it('transitions from running-hidden to failed on FAIL', () => {
      const result = submissionReducer('running-hidden', { type: 'FAIL' });
      assert.equal(result, 'failed');
    });
  });

  describe('backward transition rejection', () => {
    it('rejects compiling → idle (COMPILE_START is not backward, but idle has no event)', () => {
      // There's no event that targets 'idle', so this tests that
      // COMPILE_START from compiling is rejected (same step)
      const result = submissionReducer('compiling', { type: 'COMPILE_START' });
      assert.equal(result, 'compiling');
    });

    it('rejects running-visible → compiling', () => {
      const result = submissionReducer('running-visible', { type: 'COMPILE_START' });
      assert.equal(result, 'running-visible');
    });

    it('rejects running-hidden → running-visible', () => {
      const result = submissionReducer('running-hidden', { type: 'VISIBLE_TESTS_START' });
      assert.equal(result, 'running-hidden');
    });

    it('rejects complete → compiling', () => {
      const result = submissionReducer('complete', { type: 'COMPILE_START' });
      assert.equal(result, 'complete');
    });

    it('rejects complete → running-hidden', () => {
      const result = submissionReducer('complete', { type: 'HIDDEN_TESTS_START' });
      assert.equal(result, 'complete');
    });
  });

  describe('terminal state behavior', () => {
    it('complete state rejects all events', () => {
      const events: SubmissionEvent['type'][] = [
        'COMPILE_START',
        'VISIBLE_TESTS_START',
        'HIDDEN_TESTS_START',
        'COMPLETE',
        'FAIL',
      ];
      for (const type of events) {
        const result = submissionReducer('complete', { type });
        assert.equal(result, 'complete', `complete should reject ${type}`);
      }
    });

    it('failed state rejects all events', () => {
      const events: SubmissionEvent['type'][] = [
        'COMPILE_START',
        'VISIBLE_TESTS_START',
        'HIDDEN_TESTS_START',
        'COMPLETE',
        'FAIL',
      ];
      for (const type of events) {
        const result = submissionReducer('failed', { type });
        assert.equal(result, 'failed', `failed should reject ${type}`);
      }
    });
  });

  describe('full sequence', () => {
    it('processes a complete happy-path sequence', () => {
      let state: SubmissionStep = 'idle';
      state = submissionReducer(state, { type: 'COMPILE_START' });
      assert.equal(state, 'compiling');
      state = submissionReducer(state, { type: 'VISIBLE_TESTS_START' });
      assert.equal(state, 'running-visible');
      state = submissionReducer(state, { type: 'HIDDEN_TESTS_START' });
      assert.equal(state, 'running-hidden');
      state = submissionReducer(state, { type: 'COMPLETE' });
      assert.equal(state, 'complete');
    });

    it('processes a failure mid-sequence', () => {
      let state: SubmissionStep = 'idle';
      state = submissionReducer(state, { type: 'COMPILE_START' });
      assert.equal(state, 'compiling');
      state = submissionReducer(state, { type: 'VISIBLE_TESTS_START' });
      assert.equal(state, 'running-visible');
      state = submissionReducer(state, { type: 'FAIL' });
      assert.equal(state, 'failed');
      // After failure, no further transitions
      state = submissionReducer(state, { type: 'HIDDEN_TESTS_START' });
      assert.equal(state, 'failed');
    });
  });
});

describe('STEP_ORDER', () => {
  it('contains exactly the forward progression steps', () => {
    assert.deepEqual([...STEP_ORDER], [
      'idle',
      'compiling',
      'running-visible',
      'running-hidden',
      'complete',
    ]);
  });

  it('does not include failed (it is a terminal branch)', () => {
    assert.equal(STEP_ORDER.includes('failed' as SubmissionStep), false);
  });
});

describe('stepToProgress', () => {
  it('maps idle to 0', () => {
    assert.equal(stepToProgress('idle'), 0);
  });

  it('maps compiling to 25', () => {
    assert.equal(stepToProgress('compiling'), 25);
  });

  it('maps running-visible to 50', () => {
    assert.equal(stepToProgress('running-visible'), 50);
  });

  it('maps running-hidden to 75', () => {
    assert.equal(stepToProgress('running-hidden'), 75);
  });

  it('maps complete to 100', () => {
    assert.equal(stepToProgress('complete'), 100);
  });

  it('maps failed to 75 (last known progress before failure)', () => {
    assert.equal(stepToProgress('failed'), 75);
  });

  it('returns monotonically increasing values along STEP_ORDER', () => {
    let prev = -1;
    for (const step of STEP_ORDER) {
      const progress = stepToProgress(step);
      assert.ok(progress > prev, `${step} (${progress}) should be > ${prev}`);
      prev = progress;
    }
  });
});

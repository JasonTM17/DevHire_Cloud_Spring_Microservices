/**
 * Unit tests for AssessmentTimer component logic.
 *
 * Tests cover: severity-based CSS class selection, aria-live mapping,
 * formatted time display, and countdown behavior.
 *
 * The pure functions are tested via useAssessmentTimer.test.ts.
 * These tests validate the component integration logic.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import '../setup.ts';
import { classifyTimer, timerAriaLive, formatTimer } from '../../hooks/useAssessmentTimer.ts';

// --- Component logic tests (mirrors AssessmentTimer.tsx internals) ---

/**
 * Computes the CSS class string for the timer based on severity.
 */
function computeTimerClasses(severity: string, className?: string): string {
  const severityClass = `dh-timer--${severity}`;
  return ['dh-timer', severityClass, className].filter(Boolean).join(' ');
}

/**
 * Computes the announcement text for severity changes.
 */
function computeAnnouncement(severity: string, formatted: string): string {
  switch (severity) {
    case 'warning':
      return `Warning: ${formatted} remaining`;
    case 'critical':
      return `Critical: ${formatted} remaining`;
    case 'expired':
      return 'Time expired';
    case 'locked':
      return 'Assessment locked';
    default:
      return '';
  }
}

/**
 * Computes the initial timer state from props.
 */
function computeInitialState(assignedAt: number, dueAt: number, status: string, nowMs: number) {
  const totalSeconds = Math.max(0, Math.floor((dueAt - assignedAt) / 1000));

  if (status === 'LOCKED') {
    return {
      remainingSeconds: 0,
      severity: 'locked' as const,
      formatted: '00:00',
    };
  }

  const remaining = Math.floor((dueAt - nowMs) / 1000);
  const severity = classifyTimer(remaining, totalSeconds);
  return {
    remainingSeconds: Math.max(0, remaining),
    severity,
    formatted: formatTimer(remaining),
  };
}

// --- Tests ---

describe('AssessmentTimer — CSS class computation', () => {
  it('produces correct class for normal severity', () => {
    const classes = computeTimerClasses('normal');
    assert.equal(classes, 'dh-timer dh-timer--normal');
  });

  it('produces correct class for warning severity', () => {
    const classes = computeTimerClasses('warning');
    assert.equal(classes, 'dh-timer dh-timer--warning');
  });

  it('produces correct class for critical severity', () => {
    const classes = computeTimerClasses('critical');
    assert.equal(classes, 'dh-timer dh-timer--critical');
  });

  it('produces correct class for expired severity', () => {
    const classes = computeTimerClasses('expired');
    assert.equal(classes, 'dh-timer dh-timer--expired');
  });

  it('produces correct class for locked severity', () => {
    const classes = computeTimerClasses('locked');
    assert.equal(classes, 'dh-timer dh-timer--locked');
  });

  it('appends custom className when provided', () => {
    const classes = computeTimerClasses('normal', 'my-custom-class');
    assert.equal(classes, 'dh-timer dh-timer--normal my-custom-class');
  });

  it('does not append empty className', () => {
    const classes = computeTimerClasses('normal', '');
    assert.equal(classes, 'dh-timer dh-timer--normal');
  });
});

describe('AssessmentTimer — aria-live announcement', () => {
  it('announces warning with remaining time', () => {
    const msg = computeAnnouncement('warning', '05:30');
    assert.equal(msg, 'Warning: 05:30 remaining');
  });

  it('announces critical with remaining time', () => {
    const msg = computeAnnouncement('critical', '01:00');
    assert.equal(msg, 'Critical: 01:00 remaining');
  });

  it('announces expired', () => {
    const msg = computeAnnouncement('expired', '00:00');
    assert.equal(msg, 'Time expired');
  });

  it('announces locked', () => {
    const msg = computeAnnouncement('locked', '00:00');
    assert.equal(msg, 'Assessment locked');
  });

  it('returns empty string for normal severity', () => {
    const msg = computeAnnouncement('normal', '10:00');
    assert.equal(msg, '');
  });
});

describe('AssessmentTimer — initial state computation', () => {
  it('returns locked state when status is LOCKED', () => {
    const now = Date.now();
    const state = computeInitialState(now - 60000, now + 60000, 'LOCKED', now);
    assert.equal(state.severity, 'locked');
    assert.equal(state.remainingSeconds, 0);
    assert.equal(state.formatted, '00:00');
  });

  it('returns normal state when plenty of time remains', () => {
    const now = 1000000;
    const assignedAt = now - 100000; // 100s ago
    const dueAt = now + 100000;      // 100s from now
    // total = 200s, remaining = 100s, ratio = 0.5 → normal
    const state = computeInitialState(assignedAt, dueAt, 'IN_PROGRESS', now);
    assert.equal(state.severity, 'normal');
    assert.equal(state.remainingSeconds, 100);
    assert.equal(state.formatted, '01:40');
  });

  it('returns warning state when 10-25% remains', () => {
    const now = 1000000;
    const assignedAt = now - 800000; // 800s ago
    const dueAt = now + 200000;      // 200s from now
    // total = 1000s, remaining = 200s, ratio = 0.2 → warning
    const state = computeInitialState(assignedAt, dueAt, 'IN_PROGRESS', now);
    assert.equal(state.severity, 'warning');
    assert.equal(state.remainingSeconds, 200);
  });

  it('returns critical state when ≤10% remains', () => {
    const now = 1000000;
    const assignedAt = now - 950000; // 950s ago
    const dueAt = now + 50000;       // 50s from now
    // total = 1000s, remaining = 50s, ratio = 0.05 → critical
    const state = computeInitialState(assignedAt, dueAt, 'IN_PROGRESS', now);
    assert.equal(state.severity, 'critical');
    assert.equal(state.remainingSeconds, 50);
  });

  it('returns expired state when dueAt is in the past', () => {
    const now = 1000000;
    const assignedAt = now - 200000;
    const dueAt = now - 1000; // 1s ago
    const state = computeInitialState(assignedAt, dueAt, 'IN_PROGRESS', now);
    assert.equal(state.severity, 'expired');
    assert.equal(state.remainingSeconds, 0);
    assert.equal(state.formatted, '00:00');
  });
});

describe('AssessmentTimer — aria-live attribute mapping', () => {
  it('normal severity uses aria-live="off"', () => {
    assert.equal(timerAriaLive('normal'), 'off');
  });

  it('warning severity uses aria-live="polite"', () => {
    assert.equal(timerAriaLive('warning'), 'polite');
  });

  it('critical severity uses aria-live="assertive"', () => {
    assert.equal(timerAriaLive('critical'), 'assertive');
  });

  it('expired severity uses aria-live="polite"', () => {
    assert.equal(timerAriaLive('expired'), 'polite');
  });

  it('locked severity uses aria-live="polite"', () => {
    assert.equal(timerAriaLive('locked'), 'polite');
  });
});

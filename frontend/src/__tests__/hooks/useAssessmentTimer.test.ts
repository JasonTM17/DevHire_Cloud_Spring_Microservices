/**
 * Unit tests for useAssessmentTimer pure functions.
 * Tests classifyTimer, timerAriaLive, and formatTimer.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyTimer, timerAriaLive, formatTimer } from '../../hooks/useAssessmentTimer.ts';

describe('classifyTimer', () => {
  it('returns "locked" when status is LOCKED regardless of remaining/total', () => {
    assert.equal(classifyTimer(500, 1000, 'LOCKED'), 'locked');
    assert.equal(classifyTimer(0, 1000, 'LOCKED'), 'locked');
    assert.equal(classifyTimer(-10, 1000, 'LOCKED'), 'locked');
  });

  it('returns "expired" when remaining <= 0', () => {
    assert.equal(classifyTimer(0, 1000), 'expired');
    assert.equal(classifyTimer(-5, 1000), 'expired');
  });

  it('returns "critical" when remaining/total <= 0.10', () => {
    // 100/1000 = 0.10 → critical
    assert.equal(classifyTimer(100, 1000), 'critical');
    // 50/1000 = 0.05 → critical
    assert.equal(classifyTimer(50, 1000), 'critical');
  });

  it('returns "warning" when remaining/total <= 0.25 but > 0.10', () => {
    // 250/1000 = 0.25 → warning
    assert.equal(classifyTimer(250, 1000), 'warning');
    // 150/1000 = 0.15 → warning
    assert.equal(classifyTimer(150, 1000), 'warning');
  });

  it('returns "normal" when remaining/total > 0.25', () => {
    // 500/1000 = 0.50 → normal
    assert.equal(classifyTimer(500, 1000), 'normal');
    // 260/1000 = 0.26 → normal
    assert.equal(classifyTimer(260, 1000), 'normal');
  });

  it('returns "normal" when total <= 0 (guard against division by zero)', () => {
    assert.equal(classifyTimer(100, 0), 'normal');
    assert.equal(classifyTimer(100, -5), 'normal');
  });
});

describe('timerAriaLive', () => {
  it('maps normal to "off"', () => {
    assert.equal(timerAriaLive('normal'), 'off');
  });

  it('maps warning to "polite"', () => {
    assert.equal(timerAriaLive('warning'), 'polite');
  });

  it('maps critical to "assertive"', () => {
    assert.equal(timerAriaLive('critical'), 'assertive');
  });

  it('maps locked to "polite"', () => {
    assert.equal(timerAriaLive('locked'), 'polite');
  });

  it('maps expired to "polite"', () => {
    assert.equal(timerAriaLive('expired'), 'polite');
  });
});

describe('formatTimer', () => {
  it('formats 0 seconds as "00:00"', () => {
    assert.equal(formatTimer(0), '00:00');
  });

  it('formats negative seconds as "00:00"', () => {
    assert.equal(formatTimer(-10), '00:00');
  });

  it('formats 330 seconds as "05:30"', () => {
    assert.equal(formatTimer(330), '05:30');
  });

  it('formats 60 seconds as "01:00"', () => {
    assert.equal(formatTimer(60), '01:00');
  });

  it('formats 59 seconds as "00:59"', () => {
    assert.equal(formatTimer(59), '00:59');
  });

  it('formats 3661 seconds as "61:01" (no hour format, just mm:ss)', () => {
    assert.equal(formatTimer(3661), '61:01');
  });

  it('formats 5 seconds as "00:05"', () => {
    assert.equal(formatTimer(5), '00:05');
  });
});

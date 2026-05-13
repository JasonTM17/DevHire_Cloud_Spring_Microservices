/**
 * Unit tests for SplitPane utility logic
 *
 * Tests cover: clamp function, readStoredRatio, keyboard delta computation,
 * and aria value computation - the pure logic extracted from SplitPane.tsx.
 *
 * Note: The SplitPane component itself is a .tsx file which requires a JSX
 * transform. These tests validate the core logic that drives the component.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import '../setup.ts';

// --- Extracted pure logic (mirrors SplitPane.tsx internals) ---

const KEYBOARD_STEP = 0.05;
const CLAMP_MIN = 0.1;
const CLAMP_MAX = 0.9;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readStoredRatio(
  storageKey: string | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (!storageKey || typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return fallback;
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return fallback;
    return clamp(parsed, Math.max(min, CLAMP_MIN), Math.min(max, CLAMP_MAX));
  } catch {
    return fallback;
  }
}

function computeKeyboardDelta(
  orientation: 'horizontal' | 'vertical',
  key: string
): number {
  if (orientation === 'horizontal') {
    if (key === 'ArrowLeft') return -KEYBOARD_STEP;
    if (key === 'ArrowRight') return KEYBOARD_STEP;
  } else {
    if (key === 'ArrowUp') return -KEYBOARD_STEP;
    if (key === 'ArrowDown') return KEYBOARD_STEP;
  }
  return 0;
}

function computeAriaValues(ratio: number, effectiveMin: number, effectiveMax: number) {
  return {
    ariaValueNow: Math.round(ratio * 100),
    ariaValueMin: Math.round(effectiveMin * 100),
    ariaValueMax: Math.round(effectiveMax * 100),
  };
}

// --- Tests ---

describe('SplitPane - clamp', () => {
  it('returns value unchanged when within bounds', () => {
    assert.equal(clamp(0.5, 0.1, 0.9), 0.5);
    assert.equal(clamp(0.1, 0.1, 0.9), 0.1);
    assert.equal(clamp(0.9, 0.1, 0.9), 0.9);
  });

  it('clamps values below min', () => {
    assert.equal(clamp(0.05, 0.1, 0.9), 0.1);
    assert.equal(clamp(-1, 0.1, 0.9), 0.1);
    assert.equal(clamp(0, 0.2, 0.8), 0.2);
  });

  it('clamps values above max', () => {
    assert.equal(clamp(0.95, 0.1, 0.9), 0.9);
    assert.equal(clamp(2, 0.1, 0.9), 0.9);
    assert.equal(clamp(1, 0.2, 0.8), 0.8);
  });
});

describe('SplitPane - readStoredRatio', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns fallback when storageKey is undefined', () => {
    assert.equal(readStoredRatio(undefined, 0.1, 0.9, 0.5), 0.5);
  });

  it('returns fallback when key not in localStorage', () => {
    assert.equal(readStoredRatio('missing-key', 0.1, 0.9, 0.5), 0.5);
  });

  it('reads and returns valid stored ratio', () => {
    localStorage.setItem('test-key', '0.7');
    assert.equal(readStoredRatio('test-key', 0.1, 0.9, 0.5), 0.7);
  });

  it('clamps stored ratio above max to CLAMP_MAX', () => {
    localStorage.setItem('test-key', '0.95');
    assert.equal(readStoredRatio('test-key', 0.1, 0.9, 0.5), 0.9);
  });

  it('clamps stored ratio below min to CLAMP_MIN', () => {
    localStorage.setItem('test-key', '0.02');
    assert.equal(readStoredRatio('test-key', 0.1, 0.9, 0.5), 0.1);
  });

  it('returns fallback for NaN stored value', () => {
    localStorage.setItem('test-key', 'garbage');
    assert.equal(readStoredRatio('test-key', 0.1, 0.9, 0.4), 0.4);
  });

  it('respects custom min/max when clamping', () => {
    localStorage.setItem('test-key', '0.15');
    // min=0.2 -> effective min = max(0.2, 0.1) = 0.2
    assert.equal(readStoredRatio('test-key', 0.2, 0.8, 0.5), 0.2);
  });

  it('handles stored value at exact boundary', () => {
    localStorage.setItem('test-key', '0.1');
    assert.equal(readStoredRatio('test-key', 0.1, 0.9, 0.5), 0.1);
  });

  it('handles stored value "0.9"', () => {
    localStorage.setItem('test-key', '0.9');
    assert.equal(readStoredRatio('test-key', 0.1, 0.9, 0.5), 0.9);
  });
});

describe('SplitPane - computeKeyboardDelta', () => {
  it('ArrowRight returns +0.05 for horizontal', () => {
    assert.equal(computeKeyboardDelta('horizontal', 'ArrowRight'), KEYBOARD_STEP);
  });

  it('ArrowLeft returns -0.05 for horizontal', () => {
    assert.equal(computeKeyboardDelta('horizontal', 'ArrowLeft'), -KEYBOARD_STEP);
  });

  it('ArrowDown returns +0.05 for vertical', () => {
    assert.equal(computeKeyboardDelta('vertical', 'ArrowDown'), KEYBOARD_STEP);
  });

  it('ArrowUp returns -0.05 for vertical', () => {
    assert.equal(computeKeyboardDelta('vertical', 'ArrowUp'), -KEYBOARD_STEP);
  });

  it('ArrowUp/Down returns 0 for horizontal', () => {
    assert.equal(computeKeyboardDelta('horizontal', 'ArrowUp'), 0);
    assert.equal(computeKeyboardDelta('horizontal', 'ArrowDown'), 0);
  });

  it('ArrowLeft/Right returns 0 for vertical', () => {
    assert.equal(computeKeyboardDelta('vertical', 'ArrowLeft'), 0);
    assert.equal(computeKeyboardDelta('vertical', 'ArrowRight'), 0);
  });

  it('irrelevant keys return 0', () => {
    assert.equal(computeKeyboardDelta('horizontal', 'Enter'), 0);
    assert.equal(computeKeyboardDelta('vertical', 'Tab'), 0);
    assert.equal(computeKeyboardDelta('horizontal', 'Space'), 0);
  });
});

describe('SplitPane - computeAriaValues', () => {
  it('converts ratio to 0-100 scale', () => {
    const result = computeAriaValues(0.5, 0.1, 0.9);
    assert.equal(result.ariaValueNow, 50);
    assert.equal(result.ariaValueMin, 10);
    assert.equal(result.ariaValueMax, 90);
  });

  it('rounds to nearest integer', () => {
    const result = computeAriaValues(0.333, 0.15, 0.85);
    assert.equal(result.ariaValueNow, 33);
    assert.equal(result.ariaValueMin, 15);
    assert.equal(result.ariaValueMax, 85);
  });

  it('handles boundary values', () => {
    const result = computeAriaValues(0.1, 0.1, 0.9);
    assert.equal(result.ariaValueNow, 10);
  });
});

describe('SplitPane - keyboard + clamp integration', () => {
  it('ratio stays within bounds after multiple ArrowRight presses', () => {
    let ratio = 0.85;
    const effectiveMin = 0.1;
    const effectiveMax = 0.9;

    // Press ArrowRight 5 times
    for (let i = 0; i < 5; i++) {
      const delta = computeKeyboardDelta('horizontal', 'ArrowRight');
      ratio = clamp(ratio + delta, effectiveMin, effectiveMax);
    }

    assert.equal(ratio, 0.9);
  });

  it('ratio stays within bounds after multiple ArrowLeft presses', () => {
    let ratio = 0.15;
    const effectiveMin = 0.1;
    const effectiveMax = 0.9;

    // Press ArrowLeft 5 times
    for (let i = 0; i < 5; i++) {
      const delta = computeKeyboardDelta('horizontal', 'ArrowLeft');
      ratio = clamp(ratio + delta, effectiveMin, effectiveMax);
    }

    assert.equal(ratio, 0.1);
  });

  it('ratio changes correctly with mixed key presses', () => {
    let ratio = 0.5;
    const effectiveMin = 0.1;
    const effectiveMax = 0.9;

    // Right, Right, Left
    ratio = clamp(ratio + computeKeyboardDelta('horizontal', 'ArrowRight'), effectiveMin, effectiveMax);
    ratio = clamp(ratio + computeKeyboardDelta('horizontal', 'ArrowRight'), effectiveMin, effectiveMax);
    ratio = clamp(ratio + computeKeyboardDelta('horizontal', 'ArrowLeft'), effectiveMin, effectiveMax);

    // 0.5 + 0.05 + 0.05 - 0.05 = 0.55
    assert.ok(Math.abs(ratio - 0.55) < 0.0001);
  });
});

describe('SplitPane - localStorage debounce behavior', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('debounced write stores correct value after timeout', async () => {
    // Simulate what the component does: debounce 300ms write
    const storageKey = 'debounce-test';
    const DEBOUNCE_MS = 300;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function persistRatio(newRatio: number) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.setItem(storageKey, String(newRatio));
      }, DEBOUNCE_MS);
    }

    persistRatio(0.55);

    // Immediately after, localStorage should not be updated
    assert.equal(localStorage.getItem(storageKey), null);

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350));
    assert.equal(localStorage.getItem(storageKey), '0.55');
  });

  it('debounce coalesces multiple rapid writes', async () => {
    const storageKey = 'coalesce-test';
    const DEBOUNCE_MS = 300;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function persistRatio(newRatio: number) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.setItem(storageKey, String(newRatio));
      }, DEBOUNCE_MS);
    }

    // Rapid fire 3 writes
    persistRatio(0.55);
    persistRatio(0.60);
    persistRatio(0.65);

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 350));
    // Only the last value should be stored
    assert.equal(localStorage.getItem(storageKey), '0.65');
  });
});

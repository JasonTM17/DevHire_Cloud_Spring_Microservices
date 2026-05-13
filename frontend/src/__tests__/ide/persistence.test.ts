/**
 * Unit tests for lib/ide/persistence.ts
 *
 * Tests cover: clampRatio, saveSplitRatio, readSplitRatio, saveIdeState, readIdeState
 * including edge cases for corrupt data, missing localStorage, and out-of-range values.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import '../setup.ts';

import {
  clampRatio,
  saveSplitRatio,
  readSplitRatio,
  saveIdeState,
  readIdeState,
  type IDEPersistedState,
} from '../../lib/ide/persistence.ts';

describe('clampRatio', () => {
  it('returns value unchanged when within [0.1, 0.9]', () => {
    assert.equal(clampRatio(0.5), 0.5);
    assert.equal(clampRatio(0.1), 0.1);
    assert.equal(clampRatio(0.9), 0.9);
  });

  it('clamps values below 0.1 to 0.1', () => {
    assert.equal(clampRatio(0), 0.1);
    assert.equal(clampRatio(-1), 0.1);
    assert.equal(clampRatio(0.05), 0.1);
  });

  it('clamps values above 0.9 to 0.9', () => {
    assert.equal(clampRatio(1), 0.9);
    assert.equal(clampRatio(1.5), 0.9);
    assert.equal(clampRatio(0.95), 0.9);
  });

  it('returns 0.1 for NaN', () => {
    assert.equal(clampRatio(NaN), 0.1);
  });

  it('returns 0.1 for Infinity', () => {
    assert.equal(clampRatio(Infinity), 0.1);
    assert.equal(clampRatio(-Infinity), 0.1);
  });
});

describe('saveSplitRatio / readSplitRatio', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and reads a valid ratio', () => {
    saveSplitRatio('test-key', 0.6);
    const result = readSplitRatio('test-key', 0.5);
    assert.equal(result, 0.6);
  });

  it('clamps ratio before saving', () => {
    saveSplitRatio('test-key', 1.5);
    const result = readSplitRatio('test-key', 0.5);
    assert.equal(result, 0.9);
  });

  it('clamps ratio below minimum before saving', () => {
    saveSplitRatio('test-key', -0.5);
    const result = readSplitRatio('test-key', 0.5);
    assert.equal(result, 0.1);
  });

  it('returns clamped default when key is missing', () => {
    const result = readSplitRatio('nonexistent', 0.45);
    assert.equal(result, 0.45);
  });

  it('returns clamped default when stored value is not a number', () => {
    window.localStorage.setItem('bad-key', 'not-a-number');
    const result = readSplitRatio('bad-key', 0.5);
    assert.equal(result, 0.5);
  });

  it('clamps the default ratio too', () => {
    const result = readSplitRatio('nonexistent', 2.0);
    assert.equal(result, 0.9);
  });

  it('handles empty string in localStorage (Number("") === 0, clamped to 0.1)', () => {
    window.localStorage.setItem('empty-key', '');
    const result = readSplitRatio('empty-key', 0.4);
    // Number('') === 0, which is finite, so it gets clamped to 0.1
    assert.equal(result, 0.1);
  });
});

describe('saveIdeState / readIdeState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and reads a valid IDE state', () => {
    const state: IDEPersistedState = {
      activeTab: 'solution',
      language: 'typescript',
      horizontalRatio: 0.45,
      verticalRatio: 0.6,
      fontSize: 14,
    };
    saveIdeState(state);
    const result = readIdeState();
    assert.deepEqual(result, state);
  });

  it('returns null when no state is stored', () => {
    const result = readIdeState();
    assert.equal(result, null);
  });

  it('returns null when stored JSON is corrupt', () => {
    window.localStorage.setItem('dh.ide.state', '{invalid json!!!');
    const result = readIdeState();
    assert.equal(result, null);
  });

  it('returns null when stored value is missing required fields', () => {
    // Missing language (required)
    window.localStorage.setItem('dh.ide.state', JSON.stringify({ activeTab: 'solution' }));
    const result = readIdeState();
    assert.equal(result, null);
  });

  it('returns null when stored value has wrong types for activeTab', () => {
    window.localStorage.setItem(
      'dh.ide.state',
      JSON.stringify({
        activeTab: 123,
        language: 'java',
      })
    );
    const result = readIdeState();
    assert.equal(result, null);
  });

  it('returns null when stored value has wrong types for language', () => {
    window.localStorage.setItem(
      'dh.ide.state',
      JSON.stringify({
        activeTab: 'solution',
        language: 42,
      })
    );
    const result = readIdeState();
    assert.equal(result, null);
  });

  it('returns null when stored value is null JSON', () => {
    window.localStorage.setItem('dh.ide.state', 'null');
    const result = readIdeState();
    assert.equal(result, null);
  });

  it('returns null when stored value is an array', () => {
    window.localStorage.setItem('dh.ide.state', '[1,2,3]');
    const result = readIdeState();
    assert.equal(result, null);
  });

  it('preserves exact field values without modification', () => {
    const state: IDEPersistedState = {
      activeTab: 'visible-tests',
      language: 'java',
      horizontalRatio: 0.3,
      verticalRatio: 0.8,
      fontSize: 16,
    };
    saveIdeState(state);
    const result = readIdeState();
    assert.equal(result!.activeTab, 'visible-tests');
    assert.equal(result!.language, 'java');
    assert.equal(result!.horizontalRatio, 0.3);
    assert.equal(result!.verticalRatio, 0.8);
    assert.equal(result!.fontSize, 16);
  });

  it('reads state without optional fields (fontSize, horizontalRatio, verticalRatio)', () => {
    const state: IDEPersistedState = {
      activeTab: 'solution',
      language: 'typescript',
    };
    saveIdeState(state);
    const result = readIdeState();
    assert.deepEqual(result, {
      activeTab: 'solution',
      language: 'typescript',
    });
    assert.equal(result!.fontSize, undefined);
    assert.equal(result!.horizontalRatio, undefined);
    assert.equal(result!.verticalRatio, undefined);
  });

  it('returns null when fontSize field is a non-number value', () => {
    window.localStorage.setItem(
      'dh.ide.state',
      JSON.stringify({
        activeTab: 'solution',
        language: 'java',
        fontSize: 'big',
      })
    );
    const result = readIdeState();
    assert.equal(result, null);
  });

  it('returns null when horizontalRatio field is a non-number value', () => {
    window.localStorage.setItem(
      'dh.ide.state',
      JSON.stringify({
        activeTab: 'solution',
        language: 'java',
        horizontalRatio: 'wide',
      })
    );
    const result = readIdeState();
    assert.equal(result, null);
  });
});

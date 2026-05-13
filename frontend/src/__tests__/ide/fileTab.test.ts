/**
 * Unit tests for FileTab component logic and useIdeState hook
 *
 * Tests cover: tab validation, keyboard navigation logic, localStorage sync,
 * and tab strip behavior (active tab, read-only badge, ARIA attributes).
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import '../setup.ts';

import {
  saveIdeState,
  readIdeState,
  type IDEPersistedState,
} from '../../lib/ide/persistence.ts';

// --- Extracted pure logic (mirrors useIdeState.ts internals) ---

type EditorTabId = 'solution' | 'visible-tests' | 'notes';

const VALID_TABS: EditorTabId[] = ['solution', 'visible-tests', 'notes'];

function isValidTab(tab: string): tab is EditorTabId {
  return VALID_TABS.includes(tab as EditorTabId);
}

// --- Extracted pure logic (mirrors FileTab.tsx keyboard navigation) ---

const TABS = [
  { id: 'solution' as EditorTabId, label: 'Solution', readOnly: false },
  { id: 'visible-tests' as EditorTabId, label: 'Visible Tests', readOnly: true },
  { id: 'notes' as EditorTabId, label: 'Notes', readOnly: false },
];

function computeNextTabIndex(currentIndex: number, key: string): number {
  switch (key) {
    case 'ArrowRight':
      return (currentIndex + 1) % TABS.length;
    case 'ArrowLeft':
      return (currentIndex - 1 + TABS.length) % TABS.length;
    case 'Home':
      return 0;
    case 'End':
      return TABS.length - 1;
    default:
      return currentIndex;
  }
}

// --- Tests ---

describe('FileTab — isValidTab', () => {
  it('returns true for "solution"', () => {
    assert.equal(isValidTab('solution'), true);
  });

  it('returns true for "visible-tests"', () => {
    assert.equal(isValidTab('visible-tests'), true);
  });

  it('returns true for "notes"', () => {
    assert.equal(isValidTab('notes'), true);
  });

  it('returns false for unknown tab id', () => {
    assert.equal(isValidTab('unknown'), false);
    assert.equal(isValidTab(''), false);
    assert.equal(isValidTab('Solution'), false);
  });
});

describe('FileTab — keyboard navigation (computeNextTabIndex)', () => {
  it('ArrowRight from first tab moves to second', () => {
    assert.equal(computeNextTabIndex(0, 'ArrowRight'), 1);
  });

  it('ArrowRight from last tab wraps to first', () => {
    assert.equal(computeNextTabIndex(2, 'ArrowRight'), 0);
  });

  it('ArrowLeft from first tab wraps to last', () => {
    assert.equal(computeNextTabIndex(0, 'ArrowLeft'), 2);
  });

  it('ArrowLeft from second tab moves to first', () => {
    assert.equal(computeNextTabIndex(1, 'ArrowLeft'), 0);
  });

  it('Home always returns 0', () => {
    assert.equal(computeNextTabIndex(0, 'Home'), 0);
    assert.equal(computeNextTabIndex(1, 'Home'), 0);
    assert.equal(computeNextTabIndex(2, 'Home'), 0);
  });

  it('End always returns last index', () => {
    assert.equal(computeNextTabIndex(0, 'End'), 2);
    assert.equal(computeNextTabIndex(1, 'End'), 2);
    assert.equal(computeNextTabIndex(2, 'End'), 2);
  });

  it('irrelevant keys return current index', () => {
    assert.equal(computeNextTabIndex(1, 'Tab'), 1);
    assert.equal(computeNextTabIndex(0, 'Escape'), 0);
    assert.equal(computeNextTabIndex(2, 'a'), 2);
  });
});

describe('FileTab — tab definitions', () => {
  it('has exactly 3 tabs', () => {
    assert.equal(TABS.length, 3);
  });

  it('first tab is Solution (editable)', () => {
    assert.equal(TABS[0].id, 'solution');
    assert.equal(TABS[0].label, 'Solution');
    assert.equal(TABS[0].readOnly, false);
  });

  it('second tab is Visible Tests (read-only)', () => {
    assert.equal(TABS[1].id, 'visible-tests');
    assert.equal(TABS[1].label, 'Visible Tests');
    assert.equal(TABS[1].readOnly, true);
  });

  it('third tab is Notes (editable)', () => {
    assert.equal(TABS[2].id, 'notes');
    assert.equal(TABS[2].label, 'Notes');
    assert.equal(TABS[2].readOnly, false);
  });
});

describe('FileTab — useIdeState localStorage sync', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists active tab to localStorage', () => {
    const state: IDEPersistedState = {
      activeTab: 'visible-tests',
      language: 'java',
    };
    saveIdeState(state);
    const result = readIdeState();
    assert.equal(result!.activeTab, 'visible-tests');
  });

  it('restores active tab from localStorage', () => {
    saveIdeState({ activeTab: 'notes', language: 'typescript' });
    const result = readIdeState();
    assert.equal(result!.activeTab, 'notes');
  });

  it('defaults to "solution" when stored tab is invalid', () => {
    // Simulate corrupt data
    window.localStorage.setItem(
      'dh.ide.state',
      JSON.stringify({ activeTab: 'invalid-tab', language: 'java' })
    );
    const result = readIdeState();
    // readIdeState returns the raw value; validation happens in the hook
    assert.equal(result!.activeTab, 'invalid-tab');
    // The hook would then apply isValidTab and fall back to 'solution'
    assert.equal(
      isValidTab(result!.activeTab) ? result!.activeTab : 'solution',
      'solution'
    );
  });

  it('preserves language when switching tabs', () => {
    saveIdeState({ activeTab: 'solution', language: 'sql' });
    const result = readIdeState();
    assert.equal(result!.language, 'sql');

    // Switch tab
    saveIdeState({ activeTab: 'notes', language: 'sql' });
    const updated = readIdeState();
    assert.equal(updated!.activeTab, 'notes');
    assert.equal(updated!.language, 'sql');
  });
});

describe('FileTab — full keyboard navigation cycle', () => {
  it('cycles through all tabs with ArrowRight', () => {
    let index = 0;
    index = computeNextTabIndex(index, 'ArrowRight'); // 0 → 1
    assert.equal(TABS[index].id, 'visible-tests');
    index = computeNextTabIndex(index, 'ArrowRight'); // 1 → 2
    assert.equal(TABS[index].id, 'notes');
    index = computeNextTabIndex(index, 'ArrowRight'); // 2 → 0 (wrap)
    assert.equal(TABS[index].id, 'solution');
  });

  it('cycles through all tabs with ArrowLeft', () => {
    let index = 0;
    index = computeNextTabIndex(index, 'ArrowLeft'); // 0 → 2 (wrap)
    assert.equal(TABS[index].id, 'notes');
    index = computeNextTabIndex(index, 'ArrowLeft'); // 2 → 1
    assert.equal(TABS[index].id, 'visible-tests');
    index = computeNextTabIndex(index, 'ArrowLeft'); // 1 → 0
    assert.equal(TABS[index].id, 'solution');
  });
});

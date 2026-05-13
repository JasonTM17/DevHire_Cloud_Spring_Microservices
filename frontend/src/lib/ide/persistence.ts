/**
 * IDE persistence utilities for DevHire Cloud.
 *
 * Handles persisting and restoring IDE layout state (split ratios, active tab,
 * language) to/from localStorage. All functions are SSR-safe and handle corrupt
 * or missing data gracefully.
 *
 * Split ratios are always clamped to [0.1, 0.9] to prevent panels from
 * collapsing to invisible sizes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IDEPersistedState {
  activeTab: string;
  language: string;
  fontSize?: number;
  horizontalRatio?: number;
  verticalRatio?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IDE_STATE_KEY = 'dh.ide.state';
const MIN_RATIO = 0.1;
const MAX_RATIO = 0.9;

// ---------------------------------------------------------------------------
// Pure helpers (exported for property testing)
// ---------------------------------------------------------------------------

/**
 * Clamps a numeric value to the valid split ratio range [0.1, 0.9].
 * Returns the clamped value. If the input is NaN or not a finite number,
 * returns the nearest bound (0.1).
 */
export function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_RATIO;
  }
  if (value < MIN_RATIO) return MIN_RATIO;
  if (value > MAX_RATIO) return MAX_RATIO;
  return value;
}

// ---------------------------------------------------------------------------
// Split ratio persistence
// ---------------------------------------------------------------------------

/**
 * Saves a split ratio to localStorage under the given key.
 * The ratio is clamped to [0.1, 0.9] before saving.
 * No-op if localStorage is unavailable (SSR).
 */
export function saveSplitRatio(key: string, ratio: number): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped = clampRatio(ratio);
    window.localStorage.setItem(key, String(clamped));
  } catch {
    // localStorage may throw (quota exceeded, security restrictions)
  }
}

/**
 * Reads a split ratio from localStorage.
 * Returns the stored value clamped to [0.1, 0.9], or `defaultRatio` (also
 * clamped) if the key is missing or the stored value is not a valid number.
 */
export function readSplitRatio(key: string, defaultRatio: number): number {
  if (typeof window === 'undefined') return clampRatio(defaultRatio);
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return clampRatio(defaultRatio);
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return clampRatio(defaultRatio);
    return clampRatio(parsed);
  } catch {
    return clampRatio(defaultRatio);
  }
}

// ---------------------------------------------------------------------------
// IDE state persistence
// ---------------------------------------------------------------------------

/**
 * Saves the full IDE persisted state as JSON to localStorage.
 * No-op if localStorage is unavailable (SSR).
 */
export function saveIdeState(state: IDEPersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(IDE_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may throw (quota exceeded, security restrictions)
  }
}

/**
 * Reads the IDE persisted state from localStorage.
 * Returns null if the key is missing, the stored value is not valid JSON,
 * or the parsed value does not match the expected shape.
 */
export function readIdeState(): IDEPersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(IDE_STATE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    // Validate shape: must have the required fields with correct types
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof parsed.activeTab !== 'string' ||
      typeof parsed.language !== 'string'
    ) {
      return null;
    }
    // fontSize is optional — accept number or undefined
    if (parsed.fontSize !== undefined && typeof parsed.fontSize !== 'number') {
      return null;
    }
    // horizontalRatio is optional — accept number or undefined
    if (parsed.horizontalRatio !== undefined && typeof parsed.horizontalRatio !== 'number') {
      return null;
    }
    // verticalRatio is optional — accept number or undefined
    if (parsed.verticalRatio !== undefined && typeof parsed.verticalRatio !== 'number') {
      return null;
    }
    const state: IDEPersistedState = {
      activeTab: parsed.activeTab,
      language: parsed.language,
    };
    if (typeof parsed.fontSize === 'number') {
      state.fontSize = parsed.fontSize;
    }
    if (typeof parsed.horizontalRatio === 'number') {
      state.horizontalRatio = parsed.horizontalRatio;
    }
    if (typeof parsed.verticalRatio === 'number') {
      state.verticalRatio = parsed.verticalRatio;
    }
    return state;
  } catch {
    // JSON.parse failed or localStorage threw
    return null;
  }
}

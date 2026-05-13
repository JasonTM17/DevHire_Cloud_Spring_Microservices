/**
 * Theme management utilities for DevHire Cloud.
 *
 * Manages user theme preference (light/dark/system) persisted in localStorage
 * under key 'dh.theme'. Provides a pure resolver function suitable for
 * property-based testing.
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'dh.theme';

type ThemeSubscriber = (preference: ThemePreference) => void;

const subscribers = new Set<ThemeSubscriber>();

/**
 * Pure function: resolves the effective theme given a user preference and
 * the system's dark-mode signal.
 *
 * - If pref is 'light' or 'dark', returns pref directly.
 * - If pref is 'system', returns 'dark' when systemPrefersDark is true,
 *   otherwise 'light'.
 */
export function resolveTheme(pref: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return pref;
}

/**
 * Reads the stored theme preference from localStorage.
 * Returns 'system' if no preference is stored or the stored value is invalid.
 */
export function getTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

/**
 * Persists the user's theme preference and notifies all subscribers.
 */
export function setTheme(pref: ThemePreference): void {
  if (typeof window === 'undefined') return;
  if (pref === 'system') {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, pref);
  }
  subscribers.forEach((cb) => cb(pref));
}

/**
 * Subscribes to theme preference changes. Returns an unsubscribe function.
 */
export function subscribeTheme(cb: ThemeSubscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

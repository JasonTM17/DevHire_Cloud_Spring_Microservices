'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getTheme,
  setTheme as setThemePersist,
  subscribeTheme,
  resolveTheme,
  type ThemePreference,
  type ResolvedTheme,
} from '@/lib/theme';

interface ThemeContextValue {
  /** The user's stored preference: 'light' | 'dark' | 'system' */
  preference: ThemePreference;
  /** The actually applied theme after resolving system preference */
  resolved: ResolvedTheme;
  /** Update the user's theme preference */
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * ThemeProvider — client component that:
 * 1. Reads the stored preference from localStorage('dh.theme')
 * 2. Listens to matchMedia('(prefers-color-scheme: dark)') for system changes
 * 3. Sets document.documentElement.dataset.theme to the resolved theme
 * 4. Exposes context via useTheme() hook
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getTheme());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const resolved = useMemo(
    () => resolveTheme(preference, systemPrefersDark),
    [preference, systemPrefersDark]
  );

  // Apply resolved theme to document element
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  // Listen to system color scheme changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Subscribe to external setTheme() calls (e.g. from other tabs or modules)
  useEffect(() => {
    const unsubscribe = subscribeTheme((pref) => {
      setPreferenceState(pref);
    });
    return unsubscribe;
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    setThemePersist(pref);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access the current theme state and setter.
 * Must be used within a <ThemeProvider>.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}

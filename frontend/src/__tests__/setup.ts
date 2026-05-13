/**
 * Test setup for Node.js built-in test runner.
 * Initializes jsdom and mocks browser APIs not available in Node.
 *
 * Usage: import this file at the top of any test that needs DOM/browser APIs.
 *   import '../setup.ts' (relative from test file location)
 */

import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
});

// Expose DOM globals to Node environment
const { window } = dom;

Object.defineProperty(globalThis, 'window', { value: window, writable: true });
Object.defineProperty(globalThis, 'document', { value: window.document, writable: true });
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, writable: true });
Object.defineProperty(globalThis, 'HTMLElement', { value: window.HTMLElement, writable: true });
Object.defineProperty(globalThis, 'Element', { value: window.Element, writable: true });
Object.defineProperty(globalThis, 'Node', { value: window.Node, writable: true });
Object.defineProperty(globalThis, 'DocumentFragment', { value: window.DocumentFragment, writable: true });
Object.defineProperty(globalThis, 'Event', { value: window.Event, writable: true });
Object.defineProperty(globalThis, 'CustomEvent', { value: window.CustomEvent, writable: true });
Object.defineProperty(globalThis, 'KeyboardEvent', { value: window.KeyboardEvent, writable: true });
Object.defineProperty(globalThis, 'MouseEvent', { value: window.MouseEvent, writable: true });
Object.defineProperty(globalThis, 'MutationObserver', { value: window.MutationObserver, writable: true });
Object.defineProperty(globalThis, 'getComputedStyle', { value: window.getComputedStyle, writable: true });

// Mock window.matchMedia - returns a minimal MediaQueryList stub
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},       // deprecated but some libs still use it
    removeListener: () => {},    // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock localStorage with an in-memory implementation
const localStorageStore: Record<string, string> = {};

Object.defineProperty(window, 'localStorage', {
  writable: true,
  value: {
    getItem: (key: string): string | null => localStorageStore[key] ?? null,
    setItem: (key: string, value: string): void => {
      localStorageStore[key] = String(value);
    },
    removeItem: (key: string): void => {
      delete localStorageStore[key];
    },
    clear: (): void => {
      Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
    },
    get length(): number {
      return Object.keys(localStorageStore).length;
    },
    key: (index: number): string | null => {
      return Object.keys(localStorageStore)[index] ?? null;
    },
  },
});

// Also expose localStorage on globalThis for convenience
Object.defineProperty(globalThis, 'localStorage', {
  value: window.localStorage,
  writable: true,
});

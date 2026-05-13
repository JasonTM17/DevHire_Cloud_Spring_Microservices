"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary',
  '[contenteditable]',
].join(', ');

export interface UseFocusTrapOptions {
  /** Whether the focus trap is currently active */
  enabled: boolean;
  /** Callback invoked when the Escape key is pressed while trap is active */
  onEscape?: () => void;
}

/**
 * Traps keyboard focus within a container element.
 * When enabled:
 * - Tab/Shift+Tab cycles focus among focusable descendants
 * - Escape key calls `onEscape` callback
 * - Saves `document.activeElement` on activation, restores it on deactivation/unmount
 *
 * Handles edge case: if container has zero focusable elements, prevents focus from leaving.
 *
 * @param ref - React ref to the container element
 * @param options - Configuration for the focus trap
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions,
): void {
  const { enabled, onEscape } = options;

  // Store the previously focused element to restore on unmount/disable
  const previousFocusRef = useRef<Element | null>(null);
  // Keep onEscape stable across renders without re-attaching listener
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!enabled) return;

    const container = ref.current;
    if (!container) return;

    // Save the currently focused element to restore later
    previousFocusRef.current = document.activeElement;

    // Move focus into the container
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    } else {
      // If no focusable elements, make the container itself focusable temporarily
      // so focus doesn't escape
      if (!container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1');
        container.dataset.focusTrapTabindex = 'true';
      }
      container.focus();
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (!container) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onEscapeRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        // No focusable elements — prevent Tab from leaving container
        event.preventDefault();
        return;
      }

      const firstElement = focusable[0] as HTMLElement;
      const lastElement = focusable[focusable.length - 1] as HTMLElement;

      if (event.shiftKey) {
        // Shift+Tab: if focus is on first element, wrap to last
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if focus is on last element, wrap to first
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // Clean up temporary tabindex if we added it
      if (container.dataset.focusTrapTabindex === 'true') {
        container.removeAttribute('tabindex');
        delete container.dataset.focusTrapTabindex;
      }

      // Restore previously focused element
      const previousElement = previousFocusRef.current;
      if (previousElement && previousElement instanceof HTMLElement) {
        previousElement.focus();
      }
    };
  }, [enabled, ref]);
}

/**
 * Returns all focusable elements within a container, in DOM order.
 */
function getFocusableElements(container: HTMLElement): Element[] {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
}

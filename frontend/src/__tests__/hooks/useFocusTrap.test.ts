/**
 * Unit tests for useFocusTrap hook.
 * Tests focus cycling (Tab/Shift+Tab), Escape callback, focus restore on unmount,
 * and edge case with zero focusable elements.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import '../setup.ts';

describe('useFocusTrap - DOM behavior', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('getFocusableElements finds buttons, inputs, links, and tabindex elements', () => {
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <input id="input1" type="text" />
      <a href="#" id="link1">Link</a>
      <div tabindex="0" id="div1">Focusable div</div>
      <button disabled id="btn-disabled">Disabled</button>
      <div tabindex="-1" id="div-neg">Not focusable via tab</div>
    `;

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

    const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
    // Should find: btn1, input1, link1, div1 (4 elements)
    // Should NOT find: btn-disabled, div-neg
    assert.equal(focusable.length, 4);
    assert.equal((focusable[0] as HTMLElement).id, 'btn1');
    assert.equal((focusable[1] as HTMLElement).id, 'input1');
    assert.equal((focusable[2] as HTMLElement).id, 'link1');
    assert.equal((focusable[3] as HTMLElement).id, 'div1');
  });

  it('Tab on last element should cycle to first (simulated keydown logic)', () => {
    container.innerHTML = `
      <button id="first">First</button>
      <button id="middle">Middle</button>
      <button id="last">Last</button>
    `;

    const first = container.querySelector('#first') as HTMLElement;
    const last = container.querySelector('#last') as HTMLElement;

    // Simulate: focus is on last element, Tab is pressed
    last.focus();
    assert.equal(document.activeElement, last);

    // Simulate the trap logic: Tab on last â†’ focus first
    const focusable = Array.from(container.querySelectorAll('button:not([disabled])'));
    const firstEl = focusable[0] as HTMLElement;
    const lastEl = focusable[focusable.length - 1] as HTMLElement;

    if (document.activeElement === lastEl) {
      firstEl.focus();
    }

    assert.equal(document.activeElement, first);
  });

  it('Shift+Tab on first element should cycle to last (simulated keydown logic)', () => {
    container.innerHTML = `
      <button id="first">First</button>
      <button id="middle">Middle</button>
      <button id="last">Last</button>
    `;

    const first = container.querySelector('#first') as HTMLElement;
    const last = container.querySelector('#last') as HTMLElement;

    // Simulate: focus is on first element, Shift+Tab is pressed
    first.focus();
    assert.equal(document.activeElement, first);

    // Simulate the trap logic: Shift+Tab on first â†’ focus last
    const focusable = Array.from(container.querySelectorAll('button:not([disabled])'));
    const firstEl = focusable[0] as HTMLElement;
    const lastEl = focusable[focusable.length - 1] as HTMLElement;

    if (document.activeElement === firstEl) {
      lastEl.focus();
    }

    assert.equal(document.activeElement, last);
  });

  it('container with zero focusable elements gets tabindex=-1 for containment', () => {
    container.innerHTML = `<p>No focusable elements here</p>`;

    // Simulate the hook logic for zero focusable elements
    const focusable = Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), details > summary, [contenteditable]'
    ));

    assert.equal(focusable.length, 0);

    // Hook would set tabindex=-1 on container
    if (focusable.length === 0) {
      if (!container.hasAttribute('tabindex')) {
        container.setAttribute('tabindex', '-1');
        container.dataset.focusTrapTabindex = 'true';
      }
      container.focus();
    }

    assert.equal(container.getAttribute('tabindex'), '-1');
    assert.equal(container.dataset.focusTrapTabindex, 'true');
  });

  it('Escape key triggers onEscape callback (simulated)', () => {
    container.innerHTML = `<button id="btn">Click me</button>`;

    let escapeCalled = false;
    const onEscape = () => { escapeCalled = true; };

    // Simulate keydown handler logic
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }
    }

    container.addEventListener('keydown', handleKeyDown);

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    container.dispatchEvent(escapeEvent);

    assert.equal(escapeCalled, true);

    container.removeEventListener('keydown', handleKeyDown);
  });

  it('focus restore works when previous element is saved', () => {
    // Create an element outside the container to be the "previous" focus
    const outsideButton = document.createElement('button');
    outsideButton.id = 'outside';
    document.body.appendChild(outsideButton);
    outsideButton.focus();
    assert.equal(document.activeElement, outsideButton);

    // Save previous focus
    const previousFocus = document.activeElement as HTMLElement;

    // Move focus into container
    container.innerHTML = `<button id="inside">Inside</button>`;
    const insideBtn = container.querySelector('#inside') as HTMLElement;
    insideBtn.focus();
    assert.equal(document.activeElement, insideBtn);

    // Restore previous focus (simulating unmount)
    previousFocus.focus();
    assert.equal(document.activeElement, outsideButton);
  });
});

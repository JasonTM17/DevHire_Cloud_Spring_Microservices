/**
 * Unit tests for lib/keyboardNav.ts - nextIndex
 * Requirements: 3.5
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nextIndex } from "../../lib/keyboardNav.ts";

describe("nextIndex", () => {
  it("ArrowDown increments index by 1", () => {
    assert.equal(nextIndex(10, 3, "ArrowDown"), 4);
  });

  it("ArrowDown does not exceed n-1", () => {
    assert.equal(nextIndex(5, 4, "ArrowDown"), 4);
  });

  it("ArrowUp decrements index by 1", () => {
    assert.equal(nextIndex(10, 3, "ArrowUp"), 2);
  });

  it("ArrowUp does not go below 0", () => {
    assert.equal(nextIndex(5, 0, "ArrowUp"), 0);
  });

  it("Home returns 0", () => {
    assert.equal(nextIndex(10, 7, "Home"), 0);
  });

  it("End returns n-1", () => {
    assert.equal(nextIndex(10, 3, "End"), 9);
  });

  it("unknown key returns currentIndex unchanged", () => {
    assert.equal(nextIndex(10, 5, "Enter"), 5);
    assert.equal(nextIndex(10, 5, "Tab"), 5);
    assert.equal(nextIndex(10, 5, "a"), 5);
  });

  it("works with n=1 (single item list)", () => {
    assert.equal(nextIndex(1, 0, "ArrowDown"), 0);
    assert.equal(nextIndex(1, 0, "ArrowUp"), 0);
    assert.equal(nextIndex(1, 0, "Home"), 0);
    assert.equal(nextIndex(1, 0, "End"), 0);
  });

  it("ArrowDown from middle of list", () => {
    assert.equal(nextIndex(100, 50, "ArrowDown"), 51);
  });

  it("ArrowUp from index 1", () => {
    assert.equal(nextIndex(100, 1, "ArrowUp"), 0);
  });
});

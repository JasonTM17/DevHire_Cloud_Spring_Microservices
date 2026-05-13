/**
 * Unit tests for lib/challenges/preview.ts - extractPreview.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractPreview } from "../../lib/challenges/preview.ts";

describe("extractPreview", () => {
  it("returns full statement when lines are within limit", () => {
    const statement = "Line 1\nLine 2";
    const result = extractPreview(statement, 3);
    assert.equal(result, "Line 1\nLine 2");
  });

  it("returns full statement when lines equal limit exactly", () => {
    const statement = "Line 1\nLine 2\nLine 3";
    const result = extractPreview(statement, 3);
    assert.equal(result, "Line 1\nLine 2\nLine 3");
  });

  it("truncates and appends ellipsis when lines exceed limit", () => {
    const statement = "Line 1\nLine 2\nLine 3\nLine 4";
    const result = extractPreview(statement, 2);
    assert.equal(result, "Line 1\nLine 2\n...");
  });

  it("handles single-line statement within limit", () => {
    const statement = "Only one line";
    const result = extractPreview(statement, 1);
    assert.equal(result, "Only one line");
  });

  it("handles single-line statement with limit > 1", () => {
    const statement = "Only one line";
    const result = extractPreview(statement, 5);
    assert.equal(result, "Only one line");
  });

  it("returns ellipsis for lineLimit of 0", () => {
    const statement = "Line 1\nLine 2";
    const result = extractPreview(statement, 0);
    assert.equal(result, "...");
  });

  it("handles empty string", () => {
    const result = extractPreview("", 2);
    assert.equal(result, "");
  });

  it("preserves empty lines in the preview", () => {
    const statement = "Line 1\n\nLine 3\nLine 4";
    const result = extractPreview(statement, 3);
    assert.equal(result, "Line 1\n\nLine 3\n...");
  });
});

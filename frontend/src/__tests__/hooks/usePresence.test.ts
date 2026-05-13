/**
 * Unit tests for usePresence hook — type validation and message parsing.
 *
 * Tests the PresenceChange and ViewerCount message parsing logic
 * that the hook uses when processing WebSocket messages.
 *
 * Requirements: 8.4, 9.1, 9.2, 9.3
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Inline the parsing logic used by the hook for testability
// ---------------------------------------------------------------------------

interface PresenceChange {
  userId: string;
  status: "online" | "offline";
  context?: string;
}

interface ViewerCount {
  contextId: string;
  count: number;
}

function parsePresenceChange(body: string): PresenceChange | null {
  try {
    const event = JSON.parse(body) as PresenceChange;
    if (!event.userId || !event.status) return null;
    if (event.status !== "online" && event.status !== "offline") return null;
    return event;
  } catch {
    return null;
  }
}

function parseViewerCount(body: string): ViewerCount | null {
  try {
    const event = JSON.parse(body) as ViewerCount;
    if (!event.contextId || typeof event.count !== "number") return null;
    return event;
  } catch {
    return null;
  }
}

function applyPresenceChange(onlineUsers: Set<string>, event: PresenceChange): Set<string> {
  const next = new Set(onlineUsers);
  if (event.status === "online") {
    next.add(event.userId);
  } else if (event.status === "offline") {
    next.delete(event.userId);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePresence — PresenceChange parsing", () => {
  it("parses a valid online event", () => {
    const result = parsePresenceChange(JSON.stringify({ userId: "u1", status: "online" }));
    assert.deepEqual(result, { userId: "u1", status: "online" });
  });

  it("parses a valid offline event", () => {
    const result = parsePresenceChange(JSON.stringify({ userId: "u2", status: "offline" }));
    assert.deepEqual(result, { userId: "u2", status: "offline" });
  });

  it("parses an event with optional context", () => {
    const result = parsePresenceChange(
      JSON.stringify({ userId: "u3", status: "online", context: "job-123" })
    );
    assert.deepEqual(result, { userId: "u3", status: "online", context: "job-123" });
  });

  it("returns null for malformed JSON", () => {
    assert.equal(parsePresenceChange("not json"), null);
  });

  it("returns null for missing userId", () => {
    assert.equal(parsePresenceChange(JSON.stringify({ status: "online" })), null);
  });

  it("returns null for missing status", () => {
    assert.equal(parsePresenceChange(JSON.stringify({ userId: "u1" })), null);
  });

  it("returns null for invalid status value", () => {
    assert.equal(parsePresenceChange(JSON.stringify({ userId: "u1", status: "away" })), null);
  });
});

describe("usePresence — ViewerCount parsing", () => {
  it("parses a valid viewer count event", () => {
    const result = parseViewerCount(JSON.stringify({ contextId: "job-1", count: 5 }));
    assert.deepEqual(result, { contextId: "job-1", count: 5 });
  });

  it("parses zero viewer count", () => {
    const result = parseViewerCount(JSON.stringify({ contextId: "job-2", count: 0 }));
    assert.deepEqual(result, { contextId: "job-2", count: 0 });
  });

  it("returns null for malformed JSON", () => {
    assert.equal(parseViewerCount("invalid"), null);
  });

  it("returns null for missing contextId", () => {
    assert.equal(parseViewerCount(JSON.stringify({ count: 3 })), null);
  });

  it("returns null for missing count", () => {
    assert.equal(parseViewerCount(JSON.stringify({ contextId: "job-1" })), null);
  });

  it("returns null for non-numeric count", () => {
    assert.equal(parseViewerCount(JSON.stringify({ contextId: "job-1", count: "five" })), null);
  });
});

describe("usePresence — applyPresenceChange", () => {
  it("adds user on online event", () => {
    const initial = new Set<string>();
    const result = applyPresenceChange(initial, { userId: "u1", status: "online" });
    assert.equal(result.has("u1"), true);
    assert.equal(result.size, 1);
  });

  it("removes user on offline event", () => {
    const initial = new Set(["u1", "u2"]);
    const result = applyPresenceChange(initial, { userId: "u1", status: "offline" });
    assert.equal(result.has("u1"), false);
    assert.equal(result.has("u2"), true);
    assert.equal(result.size, 1);
  });

  it("does not duplicate user on repeated online events", () => {
    const initial = new Set(["u1"]);
    const result = applyPresenceChange(initial, { userId: "u1", status: "online" });
    assert.equal(result.size, 1);
  });

  it("handles offline for non-existent user gracefully", () => {
    const initial = new Set(["u2"]);
    const result = applyPresenceChange(initial, { userId: "u1", status: "offline" });
    assert.equal(result.size, 1);
    assert.equal(result.has("u2"), true);
  });

  it("does not mutate the original set", () => {
    const initial = new Set(["u1"]);
    applyPresenceChange(initial, { userId: "u2", status: "online" });
    assert.equal(initial.size, 1);
    assert.equal(initial.has("u1"), true);
  });
});

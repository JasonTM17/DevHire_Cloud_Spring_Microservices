/**
 * Unit tests for ConnectionStatusIndicator — pure utility functions.
 *
 * Tests the exported getStatusLabel and getStatusModifier functions.
 *
 * Requirements: 2.2
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getStatusLabel,
  getStatusModifier,
} from "../../components/notifications/connectionStatusUtils.ts";

describe("getStatusLabel", () => {
  it('returns "Connected" for connected status', () => {
    assert.equal(getStatusLabel("connected"), "Connected");
  });

  it('returns "Connecting…" for connecting status', () => {
    assert.equal(getStatusLabel("connecting"), "Connecting…");
  });

  it('returns "Disconnected" for disconnected status without reconnect attempt', () => {
    assert.equal(getStatusLabel("disconnected"), "Disconnected");
  });

  it('returns "Disconnected" for disconnected status with reconnectAttempt=0', () => {
    assert.equal(getStatusLabel("disconnected", 0), "Disconnected");
  });

  it("returns reconnection attempt message for disconnected with attempt > 0", () => {
    assert.equal(getStatusLabel("disconnected", 1), "Reconnecting (attempt 1)…");
    assert.equal(getStatusLabel("disconnected", 5), "Reconnecting (attempt 5)…");
    assert.equal(getStatusLabel("disconnected", 10), "Reconnecting (attempt 10)…");
  });

  it('returns "Using fallback polling" for polling status', () => {
    assert.equal(getStatusLabel("polling"), "Using fallback polling");
  });
});

describe("getStatusModifier", () => {
  it('returns "connected" for connected status', () => {
    assert.equal(getStatusModifier("connected"), "connected");
  });

  it('returns "connecting" for connecting status', () => {
    assert.equal(getStatusModifier("connecting"), "connecting");
  });

  it('returns "disconnected" for disconnected status', () => {
    assert.equal(getStatusModifier("disconnected"), "disconnected");
  });

  it('returns "polling" for polling status', () => {
    assert.equal(getStatusModifier("polling"), "polling");
  });
});

"use client";

import type { ConnectionStatus } from "@/hooks/useWebSocket";
import { getStatusLabel, getStatusModifier } from "./connectionStatusUtils";

import "@/styles/components/connection-status.css";

export interface ConnectionStatusIndicatorProps {
  /** Current WebSocket connection status */
  status: ConnectionStatus;
  /** Number of reconnection attempts (optional, shown during disconnected state) */
  reconnectAttempt?: number;
}

// Re-export utilities for convenience
export { getStatusLabel, getStatusModifier } from "./connectionStatusUtils";

/**
 * ConnectionStatusIndicator — Displays the current WebSocket connection state.
 *
 * Shows a colored dot with a label indicating whether the client is connected,
 * reconnecting, disconnected, or using REST polling fallback.
 *
 * Requirements: 2.2
 */
export function ConnectionStatusIndicator({
  status,
  reconnectAttempt,
}: ConnectionStatusIndicatorProps) {
  const modifier = getStatusModifier(status);
  const label = getStatusLabel(status, reconnectAttempt);

  // Only show the label when not connected (to avoid visual noise)
  // When connected, render a minimal dot; when degraded, show full label
  const isHealthy = status === "connected";

  return (
    <div
      className={`dh-conn-status dh-conn-status--${modifier}`}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${label}`}
      data-testid="connection-status-indicator"
    >
      <span className={`dh-conn-status__dot dh-conn-status__dot--${modifier}`} aria-hidden="true" />
      {!isHealthy && (
        <span className="dh-conn-status__label">{label}</span>
      )}
    </div>
  );
}

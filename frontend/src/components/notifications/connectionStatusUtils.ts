/**
 * Pure utility functions for the ConnectionStatusIndicator component.
 * Extracted into a .ts file for testability with Node's built-in test runner.
 *
 * Requirements: 2.2
 */

import type { ConnectionStatus } from "@/hooks/useWebSocket";

/**
 * Maps connection status to a human-readable label.
 */
export function getStatusLabel(status: ConnectionStatus, reconnectAttempt?: number): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting…";
    case "disconnected":
      return reconnectAttempt && reconnectAttempt > 0
        ? `Reconnecting (attempt ${reconnectAttempt})…`
        : "Disconnected";
    case "polling":
      return "Using fallback polling";
    default:
      return "Unknown";
  }
}

/**
 * Maps connection status to a CSS modifier class suffix.
 */
export function getStatusModifier(status: ConnectionStatus): string {
  switch (status) {
    case "connected":
      return "connected";
    case "connecting":
      return "connecting";
    case "disconnected":
      return "disconnected";
    case "polling":
      return "polling";
    default:
      return "disconnected";
  }
}

/**
 * Notification components — barrel export.
 *
 * Real-time notification UI components including connection status
 * indicators and notification center.
 */

export { ConnectionStatusIndicator } from "./ConnectionStatusIndicator";
export type { ConnectionStatusIndicatorProps } from "./ConnectionStatusIndicator";

export { getStatusLabel, getStatusModifier } from "./connectionStatusUtils";

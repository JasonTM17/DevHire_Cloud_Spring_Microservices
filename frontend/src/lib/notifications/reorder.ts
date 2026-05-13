/**
 * Notification message reordering utilities.
 *
 * Implements the 3-second reordering buffer logic for out-of-order
 * WebSocket messages. Messages are sorted by sequenceNumber (ascending)
 * to ensure correct display order.
 *
 * Requirements: 13.2
 */

import type { Notification } from "../../types/domain.ts";

/**
 * Reorder buffered notifications by sequenceNumber (ascending).
 * Messages without a sequenceNumber are sorted by createdAt as fallback.
 *
 * @param messages - Array of notifications potentially received out of order
 * @returns New array sorted by sequenceNumber ascending
 */
export function reorderBySequence(messages: Notification[]): Notification[] {
  return [...messages].sort((a, b) => {
    const seqA = a.sequenceNumber ?? 0;
    const seqB = b.sequenceNumber ?? 0;
    if (seqA !== seqB) return seqA - seqB;
    // Fallback to createdAt if sequence numbers are equal or missing
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

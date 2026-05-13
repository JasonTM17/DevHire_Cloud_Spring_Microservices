/**
 * Event throttle utility for viewer count updates.
 *
 * Implements a windowed throttle: for a stream of events targeting the same
 * entity, at most one event is emitted per configured time window.
 *
 * Requirements: 9.5
 */

export interface TimestampedEvent<T> {
  timestamp: number;
  payload: T;
}

/**
 * Throttles a stream of timestamped events so that at most one event
 * is emitted per entity per time window.
 *
 * @param events - Array of timestamped events (must be sorted by timestamp ascending)
 * @param windowMs - The throttle window in milliseconds
 * @returns Array of events that pass through the throttle (at most one per window)
 */
export function throttleEvents<T>(
  events: TimestampedEvent<T>[],
  windowMs: number
): TimestampedEvent<T>[] {
  if (events.length === 0) return [];

  const result: TimestampedEvent<T>[] = [];
  let lastEmittedTimestamp = -Infinity;

  for (const event of events) {
    if (event.timestamp - lastEmittedTimestamp >= windowMs) {
      result.push(event);
      lastEmittedTimestamp = event.timestamp;
    }
  }

  return result;
}

/**
 * Groups events by entity key and applies throttle per entity.
 *
 * @param events - Array of timestamped events with entity keys
 * @param windowMs - The throttle window in milliseconds
 * @param getKey - Function to extract entity key from payload
 * @returns Array of events that pass through the throttle
 */
export function throttleEventsByEntity<T>(
  events: TimestampedEvent<T>[],
  windowMs: number,
  getKey: (payload: T) => string
): TimestampedEvent<T>[] {
  if (events.length === 0) return [];

  const lastEmitted = new Map<string, number>();
  const result: TimestampedEvent<T>[] = [];

  // Events must be processed in timestamp order
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  for (const event of sorted) {
    const key = getKey(event.payload);
    const lastTime = lastEmitted.get(key) ?? -Infinity;

    if (event.timestamp - lastTime >= windowMs) {
      result.push(event);
      lastEmitted.set(key, event.timestamp);
    }
  }

  return result;
}

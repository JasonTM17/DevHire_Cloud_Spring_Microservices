/**
 * Client-side ring buffer for OPS sparkline time-series data.
 *
 * Stores up to 120 data points per metric (≈ 60 minutes at 30s polling interval).
 * Used by SparklineWidget components to render time-series charts without
 * a backend time-series endpoint.
 *
 * Validates: Requirements 6.6
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type MetricName =
  | 'requestRate'
  | 'errorRate'
  | 'p95Latency'
  | 'cpuUtilization'
  | 'memoryUtilization';

export interface DataPoint {
  value: number;
  timestamp: number;
}

export type TimeRange = '5m' | '15m' | '30m' | '1h' | '2h';

export type SparklineBuffer = Record<MetricName, DataPoint[]>;

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_BUFFER_SIZE = 120;

/** Maps each TimeRange to its duration in milliseconds. Exported for property testing. */
export const rangeMs: Record<TimeRange, number> = {
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '2h': 7_200_000,
};

// ─── Module-scoped buffer ────────────────────────────────────────────────────

const buffer: SparklineBuffer = {
  requestRate: [],
  errorRate: [],
  p95Latency: [],
  cpuUtilization: [],
  memoryUtilization: [],
};

// ─── Exported functions ──────────────────────────────────────────────────────

/**
 * Append a new data point to the specified metric's buffer.
 * If the buffer exceeds MAX_BUFFER_SIZE (120), the oldest point is evicted.
 *
 * @param metric - The metric to append to
 * @param value - The numeric value of the data point
 * @param timestamp - The epoch timestamp (ms) of the data point
 */
export function appendDataPoint(
  metric: MetricName,
  value: number,
  timestamp: number
): void {
  buffer[metric].push({ value, timestamp });
  if (buffer[metric].length > MAX_BUFFER_SIZE) {
    buffer[metric].shift();
  }
}

/**
 * Return the subset of data points for a metric that fall within the given time range.
 *
 * Computes a cutoff as `now - rangeMs[range]` and returns all points
 * where `point.timestamp >= cutoff`.
 *
 * @param metric - The metric to query
 * @param range - The time range ('5m', '15m', '30m', '1h', or '2h')
 * @param now - The current epoch timestamp (ms) used as reference
 * @returns Array of DataPoints within the time window
 */
export function bucketPoints(
  metric: MetricName,
  range: TimeRange,
  now: number
): DataPoint[] {
  const cutoff = now - rangeMs[range];
  return buffer[metric].filter((point) => point.timestamp >= cutoff);
}

/**
 * Get the current buffer state (for testing).
 *
 * @returns The full SparklineBuffer object
 */
export function getBuffer(): SparklineBuffer {
  return buffer;
}

/**
 * Clear all metric buffers (for testing).
 * Resets every metric array to empty.
 */
export function clearBuffer(): void {
  buffer.requestRate = [];
  buffer.errorRate = [];
  buffer.p95Latency = [];
  buffer.cpuUtilization = [];
  buffer.memoryUtilization = [];
}

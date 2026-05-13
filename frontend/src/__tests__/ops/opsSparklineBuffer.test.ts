/**
 * Unit tests for lib/opsSparklineBuffer.ts
 * Requirements: 6.6
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendDataPoint,
  bucketPoints,
  getBuffer,
  clearBuffer,
  rangeMs,
  type MetricName,
  type TimeRange,
} from '../../lib/opsSparklineBuffer.ts';

// Reset buffer before each test to avoid cross-test contamination
beforeEach(() => {
  clearBuffer();
});

describe('appendDataPoint', () => {
  it('appends a data point to the specified metric buffer', () => {
    appendDataPoint('requestRate', 42, 1000);
    const buf = getBuffer();
    assert.equal(buf.requestRate.length, 1);
    assert.deepEqual(buf.requestRate[0], { value: 42, timestamp: 1000 });
  });

  it('appends multiple points in order', () => {
    appendDataPoint('errorRate', 1, 1000);
    appendDataPoint('errorRate', 2, 2000);
    appendDataPoint('errorRate', 3, 3000);
    const buf = getBuffer();
    assert.equal(buf.errorRate.length, 3);
    assert.equal(buf.errorRate[0].value, 1);
    assert.equal(buf.errorRate[1].value, 2);
    assert.equal(buf.errorRate[2].value, 3);
  });

  it('evicts oldest point when buffer exceeds 120', () => {
    for (let i = 0; i < 120; i++) {
      appendDataPoint('p95Latency', i, i * 1000);
    }
    assert.equal(getBuffer().p95Latency.length, 120);

    // Append one more — should evict the oldest (value=0, timestamp=0)
    appendDataPoint('p95Latency', 999, 120_000);
    const buf = getBuffer().p95Latency;
    assert.equal(buf.length, 120);
    assert.equal(buf[0].value, 1); // oldest is now value=1
    assert.equal(buf[0].timestamp, 1000);
    assert.equal(buf[119].value, 999); // newest
    assert.equal(buf[119].timestamp, 120_000);
  });

  it('does not affect other metrics', () => {
    appendDataPoint('cpuUtilization', 50, 1000);
    assert.equal(getBuffer().memoryUtilization.length, 0);
    assert.equal(getBuffer().requestRate.length, 0);
  });
});

describe('bucketPoints', () => {
  it('returns all points within the 5m range', () => {
    const now = 1_000_000;
    // Point within 5m (300,000ms)
    appendDataPoint('requestRate', 10, now - 100_000); // 100s ago — within 5m
    appendDataPoint('requestRate', 20, now - 290_000); // 290s ago — within 5m
    appendDataPoint('requestRate', 30, now - 310_000); // 310s ago — outside 5m

    const result = bucketPoints('requestRate', '5m', now);
    assert.equal(result.length, 2);
    assert.equal(result[0].value, 10);
    assert.equal(result[1].value, 20);
  });

  it('returns all points within the 15m range', () => {
    const now = 2_000_000;
    appendDataPoint('errorRate', 1, now - 500_000); // within 15m (900,000ms)
    appendDataPoint('errorRate', 2, now - 950_000); // outside 15m

    const result = bucketPoints('errorRate', '15m', now);
    assert.equal(result.length, 1);
    assert.equal(result[0].value, 1);
  });

  it('returns all points within the 30m range', () => {
    const now = 5_000_000;
    appendDataPoint('cpuUtilization', 75, now - 1_000_000); // within 30m (1,800,000ms)
    appendDataPoint('cpuUtilization', 80, now - 2_000_000); // outside 30m

    const result = bucketPoints('cpuUtilization', '30m', now);
    assert.equal(result.length, 1);
    assert.equal(result[0].value, 75);
  });

  it('returns all points within the 1h range', () => {
    const now = 10_000_000;
    appendDataPoint('requestRate', 10, now - 1_000_000); // within 1h (3,600,000ms)
    appendDataPoint('requestRate', 20, now - 3_500_000); // within 1h
    appendDataPoint('requestRate', 30, now - 3_700_000); // outside 1h

    const result = bucketPoints('requestRate', '1h', now);
    assert.equal(result.length, 2);
    assert.equal(result[0].value, 10);
    assert.equal(result[1].value, 20);
  });

  it('returns all points within the 2h range', () => {
    const now = 20_000_000;
    appendDataPoint('memoryUtilization', 60, now - 5_000_000); // within 2h (7,200,000ms)
    appendDataPoint('memoryUtilization', 70, now - 7_500_000); // outside 2h

    const result = bucketPoints('memoryUtilization', '2h', now);
    assert.equal(result.length, 1);
    assert.equal(result[0].value, 60);
  });

  it('returns empty array when no points fall within range', () => {
    const now = 100_000_000;
    appendDataPoint('memoryUtilization', 60, now - 90_000_000); // outside all ranges

    assert.deepEqual(bucketPoints('memoryUtilization', '5m', now), []);
    assert.deepEqual(bucketPoints('memoryUtilization', '1h', now), []);
    assert.deepEqual(bucketPoints('memoryUtilization', '2h', now), []);
  });

  it('returns empty array when buffer is empty', () => {
    assert.deepEqual(bucketPoints('requestRate', '1h', Date.now()), []);
  });

  it('includes points exactly at the cutoff boundary', () => {
    const now = 10_000_000;
    const cutoff = now - rangeMs['1h']; // exactly 1h ago
    appendDataPoint('requestRate', 5, cutoff); // exactly at boundary

    const result = bucketPoints('requestRate', '1h', now);
    assert.equal(result.length, 1);
    assert.equal(result[0].value, 5);
  });
});

describe('rangeMs', () => {
  it('maps time ranges to correct millisecond values', () => {
    assert.equal(rangeMs['5m'], 300_000);
    assert.equal(rangeMs['15m'], 900_000);
    assert.equal(rangeMs['30m'], 1_800_000);
    assert.equal(rangeMs['1h'], 3_600_000);
    assert.equal(rangeMs['2h'], 7_200_000);
  });
});

describe('getBuffer', () => {
  it('returns the full buffer object with all metrics', () => {
    appendDataPoint('requestRate', 10, 1000);
    appendDataPoint('errorRate', 20, 2000);
    const buf = getBuffer();
    assert.equal(buf.requestRate.length, 1);
    assert.equal(buf.errorRate.length, 1);
    assert.equal(buf.p95Latency.length, 0);
    assert.equal(buf.cpuUtilization.length, 0);
    assert.equal(buf.memoryUtilization.length, 0);
  });
});

describe('clearBuffer', () => {
  it('clears all metric buffers', () => {
    const metrics: MetricName[] = [
      'requestRate',
      'errorRate',
      'p95Latency',
      'cpuUtilization',
      'memoryUtilization',
    ];
    for (const m of metrics) {
      appendDataPoint(m, 42, 1000);
    }

    clearBuffer();

    const buf = getBuffer();
    for (const m of metrics) {
      assert.equal(buf[m].length, 0);
    }
  });
});

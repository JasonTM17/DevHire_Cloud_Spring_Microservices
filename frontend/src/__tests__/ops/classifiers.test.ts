/**
 * Unit tests for lib/ops/classifiers.ts
 * Requirements: 6.3, 7.2, 7.3, 7.4, 7.6, 11.5
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyLag,
  classifyPoolUtilization,
  computeOverallHealth,
  detectTransitions,
  isStale,
  type ServiceHealth,
} from '../../lib/ops/classifiers.ts';

describe('classifyLag', () => {
  it('returns green for lag below 1000', () => {
    assert.equal(classifyLag(0), 'green');
    assert.equal(classifyLag(500), 'green');
    assert.equal(classifyLag(999), 'green');
    assert.equal(classifyLag(999.99), 'green');
  });

  it('returns yellow for lag between 1000 and 10000 exclusive', () => {
    assert.equal(classifyLag(1000), 'yellow');
    assert.equal(classifyLag(5000), 'yellow');
    assert.equal(classifyLag(9999), 'yellow');
  });

  it('returns red for lag at or above 10000', () => {
    assert.equal(classifyLag(10000), 'red');
    assert.equal(classifyLag(50000), 'red');
    assert.equal(classifyLag(100000), 'red');
  });
});

describe('classifyPoolUtilization', () => {
  it('returns normal for utilization below 0.70', () => {
    assert.equal(classifyPoolUtilization(0), 'normal');
    assert.equal(classifyPoolUtilization(0.5), 'normal');
    assert.equal(classifyPoolUtilization(0.69), 'normal');
  });

  it('returns warning for utilization between 0.70 and 0.85 exclusive', () => {
    assert.equal(classifyPoolUtilization(0.7), 'warning');
    assert.equal(classifyPoolUtilization(0.75), 'warning');
    assert.equal(classifyPoolUtilization(0.84), 'warning');
  });

  it('returns critical for utilization at or above 0.85', () => {
    assert.equal(classifyPoolUtilization(0.85), 'critical');
    assert.equal(classifyPoolUtilization(0.9), 'critical');
    assert.equal(classifyPoolUtilization(1.0), 'critical');
  });
});

describe('computeOverallHealth', () => {
  const makeService = (name: string, status: ServiceHealth['status']): ServiceHealth => ({
    name,
    status,
    responseTimeMs: 100,
    uptimePercent: 99.9,
    lastCheck: new Date().toISOString(),
  });

  it('returns healthy when all services are healthy', () => {
    const services = [
      makeService('auth', 'healthy'),
      makeService('api-gateway', 'healthy'),
      makeService('application', 'healthy'),
    ];
    assert.equal(computeOverallHealth(services), 'healthy');
  });

  it('returns unknown for empty service list', () => {
    assert.equal(computeOverallHealth([]), 'unknown');
  });

  it('returns unknown when at least one service has no live signal and none are degraded or critical', () => {
    const services = [
      makeService('auth', 'healthy'),
      makeService('api-gateway', 'unknown'),
    ];
    assert.equal(computeOverallHealth(services), 'unknown');
  });

  it('returns degraded when any service is degraded and none critical', () => {
    const services = [
      makeService('auth', 'healthy'),
      makeService('api-gateway', 'degraded'),
      makeService('application', 'healthy'),
    ];
    assert.equal(computeOverallHealth(services), 'degraded');
  });

  it('returns critical when any service is critical', () => {
    const services = [
      makeService('auth', 'healthy'),
      makeService('api-gateway', 'critical'),
      makeService('application', 'degraded'),
    ];
    assert.equal(computeOverallHealth(services), 'critical');
  });

  it('returns critical even if only one service is critical among many healthy', () => {
    const services = [
      makeService('auth', 'healthy'),
      makeService('api-gateway', 'healthy'),
      makeService('application', 'healthy'),
      makeService('ai-service', 'critical'),
    ];
    assert.equal(computeOverallHealth(services), 'critical');
  });
});

describe('detectTransitions', () => {
  const makeService = (name: string, status: ServiceHealth['status']): ServiceHealth => ({
    name,
    status,
    responseTimeMs: 100,
    uptimePercent: 99.9,
    lastCheck: new Date().toISOString(),
  });

  it('returns empty array when no status changes', () => {
    const old = [makeService('auth', 'healthy'), makeService('api-gateway', 'healthy')];
    const now = [makeService('auth', 'healthy'), makeService('api-gateway', 'healthy')];
    assert.deepEqual(detectTransitions(old, now), []);
  });

  it('detects a service transitioning from healthy to critical', () => {
    const old = [makeService('auth', 'healthy')];
    const now = [makeService('auth', 'critical')];
    const transitions = detectTransitions(old, now);
    assert.equal(transitions.length, 1);
    assert.equal(transitions[0].serviceName, 'auth');
    assert.equal(transitions[0].from, 'healthy');
    assert.equal(transitions[0].to, 'critical');
    assert.equal(typeof transitions[0].timestamp, 'string');
  });

  it('detects multiple transitions', () => {
    const old = [
      makeService('auth', 'healthy'),
      makeService('api-gateway', 'degraded'),
      makeService('application', 'healthy'),
    ];
    const now = [
      makeService('auth', 'critical'),
      makeService('api-gateway', 'healthy'),
      makeService('application', 'healthy'),
    ];
    const transitions = detectTransitions(old, now);
    assert.equal(transitions.length, 2);
    const names = transitions.map((t) => t.serviceName).sort();
    assert.deepEqual(names, ['api-gateway', 'auth']);
  });

  it('ignores new services not present in old snapshot', () => {
    const old = [makeService('auth', 'healthy')];
    const now = [makeService('auth', 'healthy'), makeService('new-service', 'critical')];
    const transitions = detectTransitions(old, now);
    assert.equal(transitions.length, 0);
  });

  it('ignores services removed from new snapshot', () => {
    const old = [makeService('auth', 'healthy'), makeService('removed', 'critical')];
    const now = [makeService('auth', 'healthy')];
    const transitions = detectTransitions(old, now);
    assert.equal(transitions.length, 0);
  });
});

describe('isStale', () => {
  it('returns false when data is fresh (within threshold)', () => {
    const now = 100000;
    const fetchedAt = now - 30000; // 30s ago
    assert.equal(isStale(fetchedAt, now), false);
  });

  it('returns false when exactly at threshold boundary', () => {
    const now = 100000;
    const fetchedAt = now - 60000; // exactly 60s ago
    assert.equal(isStale(fetchedAt, now), false);
  });

  it('returns true when data exceeds default threshold', () => {
    const now = 100000;
    const fetchedAt = now - 60001; // just over 60s
    assert.equal(isStale(fetchedAt, now), true);
  });

  it('uses custom threshold when provided', () => {
    const now = 100000;
    const fetchedAt = now - 5001;
    assert.equal(isStale(fetchedAt, now, 5000), true);
    assert.equal(isStale(fetchedAt, now, 10000), false);
  });

  it('returns false when fetchedAt equals now', () => {
    assert.equal(isStale(1000, 1000), false);
  });
});

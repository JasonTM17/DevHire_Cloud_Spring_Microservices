/**
 * Unit tests for lib/navLinks.ts â€” filterNavByRole and selectNavMode
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterNavByRole,
  selectNavMode,
  navLinks,
  type NavLink,
  type NavUserRole,
  type NavMode,
} from '../lib/navLinks.ts';

describe('filterNavByRole', () => {
  it('returns links with no roles restriction (visible to all)', () => {
    const links: NavLink[] = [
      { label: 'About', href: '/about' },
      { label: 'Admin Only', href: '/admin', roles: ['ADMIN'] },
    ];

    const result = filterNavByRole(links, 'CANDIDATE');
    assert.equal(result.length, 1);
    assert.equal(result[0].label, 'About');
  });

  it('returns links matching the given role', () => {
    const links: NavLink[] = [
      { label: 'Dashboard', href: '/candidate/dashboard', roles: ['CANDIDATE'] },
      { label: 'Pipeline', href: '/employer/pipeline', roles: ['EMPLOYER'] },
    ];

    const result = filterNavByRole(links, 'CANDIDATE');
    assert.equal(result.length, 1);
    assert.equal(result[0].label, 'Dashboard');
  });

  it('returns links shared across multiple roles', () => {
    const links: NavLink[] = [
      { label: 'Challenges', href: '/challenges', roles: ['PUBLIC', 'CANDIDATE'] },
    ];

    const resultPublic = filterNavByRole(links, 'PUBLIC');
    assert.equal(resultPublic.length, 1);

    const resultCandidate = filterNavByRole(links, 'CANDIDATE');
    assert.equal(resultCandidate.length, 1);

    const resultEmployer = filterNavByRole(links, 'EMPLOYER');
    assert.equal(resultEmployer.length, 0);
  });

  it('recursively filters children', () => {
    const links: NavLink[] = [
      {
        label: 'Parent',
        href: '/parent',
        roles: ['ADMIN'],
        children: [
          { label: 'Child A', href: '/parent/a', roles: ['ADMIN'] },
          { label: 'Child B', href: '/parent/b', roles: ['EMPLOYER'] },
        ],
      },
    ];

    const result = filterNavByRole(links, 'ADMIN');
    assert.equal(result.length, 1);
    assert.equal(result[0].children?.length, 1);
    assert.equal(result[0].children?.[0].label, 'Child A');
  });

  it('returns empty array when no links match', () => {
    const links: NavLink[] = [
      { label: 'Admin', href: '/admin', roles: ['ADMIN'] },
    ];

    const result = filterNavByRole(links, 'PUBLIC');
    assert.equal(result.length, 0);
  });

  it('returns all links when all have undefined roles', () => {
    const links: NavLink[] = [
      { label: 'A', href: '/a' },
      { label: 'B', href: '/b' },
    ];

    const result = filterNavByRole(links, 'EMPLOYER');
    assert.equal(result.length, 2);
  });

  it('does not mutate the original links array', () => {
    const links: NavLink[] = [
      { label: 'A', href: '/a', roles: ['ADMIN'] },
      { label: 'B', href: '/b', roles: ['CANDIDATE'] },
    ];
    const originalLength = links.length;

    filterNavByRole(links, 'ADMIN');
    assert.equal(links.length, originalLength);
  });

  // Test with the actual navLinks tree
  it('filters navLinks for CANDIDATE role correctly', () => {
    const result = filterNavByRole(navLinks, 'CANDIDATE');
    const labels = result.map((l) => l.label);

    assert.ok(labels.includes('Challenges'));
    assert.ok(labels.includes('Dashboard'));
    assert.ok(labels.includes('My Applications'));
    assert.ok(labels.includes('Assessments'));
    assert.ok(labels.includes('Profile'));
    assert.ok(!labels.includes('Pipeline'));
    assert.ok(!labels.includes('Overview'));
    assert.ok(!labels.includes('Home'));
  });

  it('filters navLinks for EMPLOYER role correctly', () => {
    const result = filterNavByRole(navLinks, 'EMPLOYER');
    const labels = result.map((l) => l.label);

    assert.ok(labels.includes('Dashboard'));
    assert.ok(labels.includes('Pipeline'));
    assert.ok(labels.includes('Job Postings'));
    assert.ok(labels.includes('Assessments'));
    assert.ok(labels.includes('Analytics'));
    assert.ok(!labels.includes('My Applications'));
    assert.ok(!labels.includes('Overview'));
  });

  it('filters navLinks for ADMIN role correctly', () => {
    const result = filterNavByRole(navLinks, 'ADMIN');
    const labels = result.map((l) => l.label);

    assert.ok(labels.includes('Overview'));
    assert.ok(labels.includes('AI Ops'));
    assert.ok(labels.includes('Observability'));
    assert.ok(labels.includes('Audit Logs'));
    assert.ok(labels.includes('Users'));
    assert.ok(!labels.includes('Dashboard'));
    assert.ok(!labels.includes('Pipeline'));
  });

  it('filters navLinks for PUBLIC role correctly', () => {
    const result = filterNavByRole(navLinks, 'PUBLIC');
    const labels = result.map((l) => l.label);

    assert.ok(labels.includes('Home'));
    assert.ok(labels.includes('Challenges'));
    assert.ok(labels.includes('Jobs'));
    assert.ok(labels.includes('About'));
    assert.ok(!labels.includes('Dashboard'));
    assert.ok(!labels.includes('Overview'));
    assert.ok(!labels.includes('Pipeline'));
  });
});

describe('selectNavMode', () => {
  it('returns mobile for viewport < 768', () => {
    assert.equal(selectNavMode(0), 'mobile');
    assert.equal(selectNavMode(320), 'mobile');
    assert.equal(selectNavMode(767), 'mobile');
  });

  it('returns condensed for viewport 768â€“1023', () => {
    assert.equal(selectNavMode(768), 'condensed');
    assert.equal(selectNavMode(900), 'condensed');
    assert.equal(selectNavMode(1023), 'condensed');
  });

  it('returns desktop for viewport >= 1024', () => {
    assert.equal(selectNavMode(1024), 'desktop');
    assert.equal(selectNavMode(1440), 'desktop');
    assert.equal(selectNavMode(1920), 'desktop');
  });

  it('handles exact boundary values correctly', () => {
    assert.equal(selectNavMode(767), 'mobile');
    assert.equal(selectNavMode(768), 'condensed');
    assert.equal(selectNavMode(1023), 'condensed');
    assert.equal(selectNavMode(1024), 'desktop');
  });

  it('handles edge case of 0 width', () => {
    assert.equal(selectNavMode(0), 'mobile');
  });

  it('handles very large viewport widths', () => {
    assert.equal(selectNavMode(3840), 'desktop');
  });
});

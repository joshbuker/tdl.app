import { describe, expect, test } from 'vitest';
import { summarise, toTable, warningsFor, type PackageStats } from '../src/stats.ts';

const NOW = Date.parse('2026-11-26T00:00:00Z');

const registryDoc = {
  'dist-tags': { latest: '2.0.0' },
  time: {
    created: '2020-01-01T00:00:00Z',
    modified: '2026-11-01T00:00:00Z',
    '1.0.0': '2020-01-01T00:00:00Z',
    '1.1.0': '2026-03-01T00:00:00Z',
    '2.0.0': '2026-11-01T00:00:00Z',
  },
  maintainers: [{ name: 'a' }, { name: 'b' }],
  versions: {
    '2.0.0': {
      license: 'MIT',
      dependencies: { x: '^1', y: '^2' },
      scripts: { postinstall: 'node build.js', test: 'vitest' },
      repository: { url: 'git+https://github.com/owner/repo.git' },
    },
  },
};

const healthy: PackageStats = {
  name: 'healthy',
  latest: '2.0.0',
  licence: 'MIT',
  deprecated: null,
  created: '2020-01-01',
  released: '2026-11-01',
  releasesLastYear: 2,
  maintainers: 2,
  weeklyDownloads: 50_000,
  dependencies: 0,
  installScripts: [],
  vulnerabilitiesEver: 0,
  vulnerabilitiesInLatest: [],
  repository: 'owner/repo',
  stars: 500,
  contributors: 20,
  openIssues: 3,
  lastPush: '2026-11-20',
  archived: false,
};

describe('summarise', () => {
  test('reads the latest version and the package history from the registry document', () => {
    const stats = summarise({
      name: 'pkg',
      registry: registryDoc,
      weeklyDownloads: 1234,
      vulnerabilitiesEver: ['GHSA-1', 'GHSA-2'],
      vulnerabilitiesInLatest: ['GHSA-2'],
      github: null,
      now: NOW,
    });
    expect(stats).toMatchObject({
      name: 'pkg',
      latest: '2.0.0',
      licence: 'MIT',
      created: '2020-01-01',
      released: '2026-11-01',
      releasesLastYear: 2,
      maintainers: 2,
      weeklyDownloads: 1234,
      dependencies: 2,
      installScripts: ['postinstall'],
      vulnerabilitiesEver: 2,
      vulnerabilitiesInLatest: ['GHSA-2'],
      repository: 'owner/repo',
      stars: null,
    });
  });
});

describe('warningsFor', () => {
  test('a widely used, maintained package has none', () => {
    expect(warningsFor(healthy, NOW)).toEqual([]);
  });

  test('flags barely used, young, stale, archived, deprecated, vulnerable and install-script packages', () => {
    const risky: PackageStats = {
      ...healthy,
      weeklyDownloads: 45,
      created: '2026-10-29',
      released: '2025-06-01',
      archived: true,
      deprecated: 'use other',
      vulnerabilitiesInLatest: ['GHSA-9'],
      installScripts: ['install'],
    };
    expect(warningsFor(risky, NOW)).toEqual([
      'barely used (45/week)',
      'under a year old',
      'no release in a year',
      'archived',
      'deprecated: use other',
      'known vulnerabilities in latest: GHSA-9',
      'install scripts: install',
    ]);
  });
});

describe('toTable', () => {
  test('prints one Markdown row per package, with its warnings', () => {
    const table = toTable([healthy, { ...healthy, name: 'tiny', weeklyDownloads: 10 }], NOW);
    const lines = table.split('\n');
    expect(lines[0]).toMatch(/^\| Package \| Version \| Licence \|/);
    expect(lines).toHaveLength(4);
    expect(lines[2]).toContain('| healthy | 2.0.0 | MIT |');
    expect(lines[3]).toContain('barely used (10/week)');
  });
});

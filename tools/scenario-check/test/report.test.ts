import { expect, test } from 'vitest';
import { readPlaywrightReport, readVitestReport } from '../src/report.ts';

const report = {
  testResults: [
    {
      name: '/repo/packages/x/test/a.acceptance.test.ts',
      assertionResults: [
        { ancestorTitles: ['Link tasks'], title: 'Reject a cycle', status: 'passed' },
        { ancestorTitles: ['Link tasks'], title: 'Add a prerequisite', status: 'todo' },
        { ancestorTitles: ['Link tasks'], title: 'Pending one', status: 'pending' },
      ],
    },
    {
      name: '/repo/packages/x/test/a.test.ts',
      assertionResults: [{ ancestorTitles: ['Link tasks'], title: 'Unit', status: 'passed' }],
    },
  ],
};

test('reads acceptance results and ignores other test files', () => {
  const results = readVitestReport(report);
  expect(results).toContainEqual({
    file: '/repo/packages/x/test/a.acceptance.test.ts',
    ancestorTitles: ['Link tasks'],
    feature: 'Link tasks',
    scenario: 'Reject a cycle',
    status: 'passed',
  });
  expect(results.map((r) => r.scenario)).not.toContain('Unit');
});

test('todo and pending become skipped', () => {
  const results = readVitestReport(report);
  expect(results.find((r) => r.scenario === 'Add a prerequisite')?.status).toBe('skipped');
  expect(results.find((r) => r.scenario === 'Pending one')?.status).toBe('skipped');
});

// The shape of Playwright's JSON reporter: a suite per file, a suite per describe, specs inside.
const playwrightReport = {
  suites: [
    {
      title: 'login.acceptance.test.ts',
      file: 'login.acceptance.test.ts',
      specs: [],
      suites: [
        {
          title: 'Login',
          file: 'login.acceptance.test.ts',
          specs: [
            { title: 'Not logged in', ok: true, tests: [{ status: 'expected' }] },
            { title: 'Log in', ok: false, tests: [{ status: 'unexpected' }] },
            { title: 'Log out', ok: true, tests: [{ status: 'skipped' }] },
          ],
        },
      ],
    },
    {
      title: 'reload.test.ts',
      file: 'reload.test.ts',
      specs: [],
      suites: [{ title: 'Reload', file: 'reload.test.ts', specs: [{ title: 'Unit', ok: true, tests: [{ status: 'expected' }] }] }],
    },
  ],
};

test('reads Playwright acceptance results and ignores other test files', () => {
  const results = readPlaywrightReport(playwrightReport);
  expect(results).toContainEqual({
    file: 'login.acceptance.test.ts',
    ancestorTitles: ['Login'],
    feature: 'Login',
    scenario: 'Not logged in',
    status: 'passed',
  });
  expect(results.map((r) => r.scenario)).not.toContain('Unit');
});

test('Playwright failures and skips keep their status', () => {
  const results = readPlaywrightReport(playwrightReport);
  expect(results.find((r) => r.scenario === 'Log in')?.status).toBe('failed');
  expect(results.find((r) => r.scenario === 'Log out')?.status).toBe('skipped');
});

test('Playwright tests outside a describe, or nested in two, keep their ancestors', () => {
  const results = readPlaywrightReport({
    suites: [
      {
        title: 'a.acceptance.test.ts',
        file: 'a.acceptance.test.ts',
        specs: [{ title: 'Top level', ok: true, tests: [{ status: 'expected' }] }],
        suites: [
          {
            title: 'Login',
            suites: [{ title: 'Inner', specs: [{ title: 'Nested', ok: true, tests: [{ status: 'expected' }] }] }],
          },
        ],
      },
    ],
  });
  expect(results.find((r) => r.scenario === 'Top level')?.ancestorTitles).toEqual([]);
  expect(results.find((r) => r.scenario === 'Nested')?.ancestorTitles).toEqual(['Login', 'Inner']);
});

test('rejects JSON that is not a Playwright report', () => {
  expect(() => readPlaywrightReport({})).toThrow();
});

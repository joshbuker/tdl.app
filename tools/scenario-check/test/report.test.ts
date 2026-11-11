import { expect, test } from 'vitest';
import { readVitestReport } from '../src/report.ts';

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

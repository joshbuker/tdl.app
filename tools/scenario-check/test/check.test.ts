import { describe, expect, test } from 'vitest';
import { checkScenarios } from '../src/check.ts';
import type { AcceptanceResult } from '../src/report.ts';
import type { Spec } from '../src/specs.ts';

const linkTasks: Spec = {
  path: 'dependencies/link-tasks.md',
  title: 'Link tasks',
  status: 'Specified',
  scenarios: ['Add a prerequisite', 'Reject a cycle'],
};

function result(scenario: string, opts: Partial<AcceptanceResult> = {}): AcceptanceResult {
  return {
    file: 'x.acceptance.test.ts',
    ancestorTitles: ['Link tasks'],
    feature: 'Link tasks',
    scenario,
    status: 'passed',
    ...opts,
  };
}

describe('checkScenarios', () => {
  test('a scenario in scope with no result is missing', () => {
    const scope = { 'dependencies/link-tasks.md': ['Reject a cycle'] };
    expect(checkScenarios([linkTasks], scope, [])).toEqual([
      { kind: 'missing', feature: 'Link tasks', scenario: 'Reject a cycle' },
    ]);
  });

  test('a result for an unknown feature or scenario is an orphan', () => {
    const results = [result('Whatever', { ancestorTitles: ['Nope'], feature: 'Nope' }), result('Not in spec')];
    expect(checkScenarios([linkTasks], {}, results)).toEqual([
      { kind: 'orphan', feature: 'Nope', scenario: 'Whatever' },
      { kind: 'orphan', feature: 'Link tasks', scenario: 'Not in spec' },
    ]);
  });

  test('an Implemented spec requires every scenario, and a skipped one is reported', () => {
    const implemented: Spec = { ...linkTasks, status: 'Implemented' };
    const results = [result('Add a prerequisite', { status: 'skipped' })];
    expect(checkScenarios([implemented], {}, results)).toEqual([
      { kind: 'skipped', feature: 'Link tasks', scenario: 'Add a prerequisite' },
      { kind: 'missing', feature: 'Link tasks', scenario: 'Reject a cycle' },
    ]);
  });

  test('a scope entry naming an unknown spec or scenario is reported', () => {
    const scope = { 'nope.md': ['X'], 'dependencies/link-tasks.md': ['Not a scenario'] };
    expect(checkScenarios([linkTasks], scope, [])).toEqual([
      { kind: 'unknown-scope', feature: 'nope.md', scenario: 'X' },
      { kind: 'unknown-scope', feature: 'Link tasks', scenario: 'Not a scenario' },
    ]);
  });

  test('a result not nested in exactly one describe is malformed', () => {
    const results = [
      result('Reject a cycle', { ancestorTitles: [], feature: '' }),
      result('Add a prerequisite', { ancestorTitles: ['Link tasks', 'Inner'] }),
    ];
    expect(checkScenarios([linkTasks], {}, results)).toEqual([
      { kind: 'malformed', feature: '', scenario: 'Reject a cycle' },
      { kind: 'malformed', feature: 'Link tasks › Inner', scenario: 'Add a prerequisite' },
    ]);
  });

  test('everything matching gives no problems', () => {
    const scope = { 'dependencies/link-tasks.md': ['Add a prerequisite', 'Reject a cycle'] };
    const results = [result('Add a prerequisite'), result('Reject a cycle')];
    expect(checkScenarios([linkTasks], scope, results)).toEqual([]);
  });
});

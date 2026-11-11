import { expect, test } from 'vitest';
import { parseSpec } from '../src/specs.ts';

const fixture = `# Link tasks

Status: Specified
Release: v1

## Rules

### Not a scenario

Some rule.

## Scenarios

### Add a prerequisite

Given...

### Reject a cycle

Given...

## Open questions

- None.
`;

test('parses the title, status and scenario names of a spec', () => {
  expect(parseSpec(fixture, 'dependencies/link-tasks.md')).toEqual({
    path: 'dependencies/link-tasks.md',
    title: 'Link tasks',
    status: 'Specified',
    scenarios: ['Add a prerequisite', 'Reject a cycle'],
  });
});

test('scenarios run to the end of the file when no section follows', () => {
  const spec = parseSpec('# T\n\nStatus: Proposed\n\n## Scenarios\n\n### Only one\n', 't.md');
  expect(spec.scenarios).toEqual(['Only one']);
  expect(spec.status).toBe('Proposed');
});

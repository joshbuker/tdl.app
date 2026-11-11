import { describe, expect, test } from 'vitest';
import { findViolations, isAllowed } from '../src/policy.ts';

const allowed = ['MIT', 'Apache-2.0', 'ISC'];

describe('isAllowed', () => {
  test('a single allowed licence', () => {
    expect(isAllowed('MIT', allowed)).toBe(true);
  });

  test('OR needs any branch allowed', () => {
    expect(isAllowed('(MIT OR FSL-1.1-MIT)', allowed)).toBe(true);
  });

  test('AND needs every branch allowed', () => {
    expect(isAllowed('MIT AND BUSL-1.1', allowed)).toBe(false);
    expect(isAllowed('MIT AND ISC', allowed)).toBe(true);
  });

  test('nested parentheses', () => {
    expect(isAllowed('(SSPL-1.0 OR (MIT AND ISC))', allowed)).toBe(true);
    expect(isAllowed('(SSPL-1.0 OR (MIT AND BUSL-1.1))', allowed)).toBe(false);
  });

  test('source-available and unknown licences are refused', () => {
    expect(isAllowed('SSPL-1.0', allowed)).toBe(false);
    expect(isAllowed('UNKNOWN', allowed)).toBe(false);
  });

  test('IDs are case-insensitive', () => {
    expect(isAllowed('mit or apache-2.0', allowed)).toBe(true);
  });

  test('malformed expressions are refused', () => {
    expect(isAllowed('(MIT', allowed)).toBe(false);
    expect(isAllowed('MIT OR', allowed)).toBe(false);
    expect(isAllowed('', allowed)).toBe(false);
  });
});

describe('findViolations', () => {
  const byLicence = {
    MIT: [{ name: 'ok-pkg', versions: ['1.0.0'] }],
    'BUSL-1.1': [
      { name: 'bad-pkg', versions: ['2.0.0'] },
      { name: 'excepted-pkg', versions: ['3.0.0'] },
    ],
  };

  test('reports packages whose licence is not allowed, skipping exceptions', () => {
    const policy = { allowed, exceptions: { 'excepted-pkg': 'Dual-licensed MIT in its LICENSE file' } };
    expect(findViolations(byLicence, policy)).toEqual([
      { name: 'bad-pkg', versions: ['2.0.0'], licence: 'BUSL-1.1' },
    ]);
  });
});

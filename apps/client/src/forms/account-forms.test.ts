import { ApiError } from '@tdl/app-core';
import { NetworkError } from '@tdl/sync';
import { describe, expect, test } from 'vitest';
import type { AppViewState } from '../composables/useApp.ts';
import { canSubmitAccountForm, errorKey, formErrors } from './account-forms.ts';

describe('errorKey', () => {
  test('a code with a translation uses it', () => {
    expect(errorKey('invalid-credentials')).toBe('errors.invalid-credentials');
  });

  test('a code without one falls back to errors.unknown', () => {
    expect(errorKey('SOME_BETTER_AUTH_CODE')).toBe('errors.unknown');
  });

  test("an object's own properties aren't mistaken for codes", () => {
    expect(errorKey('constructor')).toBe('errors.unknown');
  });
});

describe('formErrors', () => {
  const fields = ['username', 'email'] as const;

  test('field errors go on their fields', () => {
    const error = new ApiError(422, 'invalid', [
      { field: 'username', code: 'taken' },
      { field: 'email', code: 'invalid' },
    ]);
    expect(formErrors(error, fields)).toEqual({
      form: null,
      fields: { username: 'errors.taken', email: 'errors.invalid' },
    });
  });

  test("a field's first error is the one shown", () => {
    const error = new ApiError(422, 'invalid', [
      { field: 'username', code: 'required' },
      { field: 'username', code: 'taken' },
    ]);
    expect(formErrors(error, fields).fields).toEqual({ username: 'errors.required' });
  });

  test("an error on a field the form doesn't show goes on the form", () => {
    const error = new ApiError(422, 'invalid', [{ field: 'name', code: 'unknown-field' }]);
    expect(formErrors(error, fields)).toEqual({ form: 'errors.unknown-field', fields: {} });
  });

  test('an error without field errors goes on the form', () => {
    expect(formErrors(new ApiError(401, 'invalid-credentials'), fields)).toEqual({
      form: 'errors.invalid-credentials',
      fields: {},
    });
  });

  test('an untranslated code shows errors.unknown', () => {
    expect(formErrors(new ApiError(400, 'SOMETHING_NEW'), fields).form).toBe('errors.unknown');
  });

  test('an unreachable server says so', () => {
    expect(formErrors(new NetworkError(), fields).form).toBe('errors.network');
  });

  test('anything else shows errors.unknown', () => {
    expect(formErrors(new Error('boom'), fields).form).toBe('errors.unknown');
  });
});

describe('canSubmitAccountForm', () => {
  test('logged out, the login and sign-up forms submit', () => {
    expect(canSubmitAccountForm({ kind: 'logged-out' })).toBe(true);
  });

  // Starting, the tab lock may not be held yet, and submitting would open the store without it.
  test.each(['starting', 'other-tab', 'ready'] as const)('%s, they do not', (kind) => {
    expect(canSubmitAccountForm({ kind } as AppViewState)).toBe(false);
  });
});

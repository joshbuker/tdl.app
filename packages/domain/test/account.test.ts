import { describe, expect, test } from 'vitest';
import { validateAccountInput } from '../src/account.ts';

const valid = {
  username: 'alice',
  email: 'alice@example.com',
  password: 'correct horse battery',
  givenName: 'Alice',
  familyName: 'Smith',
};

function codes(input: Partial<typeof valid>): string[] {
  const result = validateAccountInput({ ...valid, ...input });
  return result.ok ? [] : result.errors.map((e) => `${e.field}:${e.code}`);
}

describe('validateAccountInput', () => {
  test('accepts valid input and trims names', () => {
    expect(validateAccountInput({ ...valid, givenName: ' Alice ', familyName: ' Smith ' })).toEqual({
      ok: true,
      value: valid,
    });
  });

  test('username is required', () => {
    expect(codes({ username: '' })).toEqual(['username:required']);
  });

  test('a 70-code-point username is too long, 69 is fine', () => {
    expect(codes({ username: 'a'.repeat(70) })).toEqual(['username:too-long']);
    expect(codes({ username: 'a'.repeat(69) })).toEqual([]);
    expect(codes({ username: '😀'.repeat(70) })).toEqual(['username:too-long']);
  });

  test('username may not contain whitespace', () => {
    expect(codes({ username: 'al ice' })).toEqual(['username:whitespace']);
  });

  test('an emoji or non-Latin username is fine', () => {
    expect(codes({ username: '😀' })).toEqual([]);
    expect(codes({ username: 'アリス' })).toEqual([]);
  });

  test('email must be valid and is never lowercased', () => {
    expect(codes({ email: 'alice.example.com' })).toEqual(['email:invalid']);
    expect(codes({ email: '' })).toEqual(['email:required']);
    expect(codes({ email: 'Alice@example.com' })).toEqual(['email:uppercase']);
  });

  test('password is 14 to 128 characters', () => {
    expect(codes({ password: 'a'.repeat(13) })).toEqual(['password:too-short']);
    expect(codes({ password: 'a'.repeat(14) })).toEqual([]);
    expect(codes({ password: 'a'.repeat(128) })).toEqual([]);
    expect(codes({ password: 'a'.repeat(129) })).toEqual(['password:too-long']);
  });

  test('names are required', () => {
    expect(codes({ givenName: '  ' })).toEqual(['givenName:required']);
    expect(codes({ familyName: '' })).toEqual(['familyName:required']);
  });
});

import { describe, expect, test } from 'vitest';
import { MAX_TEXT_LENGTH, MAX_TITLE_LENGTH, validateListInput, validateTaskInput } from '../src/validation.ts';

describe('validateTaskInput', () => {
  test('trims the title and defaults notes to empty', () => {
    expect(validateTaskInput({ title: '  Buy milk  ' })).toEqual({
      ok: true,
      value: { title: 'Buy milk', notes: '' },
    });
  });

  test('a title of only whitespace is required', () => {
    expect(validateTaskInput({ title: '  \t\n ' })).toEqual({
      ok: false,
      errors: [{ field: 'title', code: 'required' }],
    });
  });

  test('a title of only non-breaking and other Unicode spaces is required', () => {
    expect(validateTaskInput({ title: '  　' })).toEqual({
      ok: false,
      errors: [{ field: 'title', code: 'required' }],
    });
  });

  test('inner whitespace in the title is kept', () => {
    const result = validateTaskInput({ title: 'Buy  oat\tmilk' });
    expect(result).toEqual({ ok: true, value: { title: 'Buy  oat\tmilk', notes: '' } });
  });

  test('notes are kept verbatim', () => {
    const result = validateTaskInput({ title: 'Buy milk', notes: '  two litres\n' });
    expect(result).toEqual({ ok: true, value: { title: 'Buy milk', notes: '  two litres\n' } });
  });
});

describe('validateListInput', () => {
  test('an empty title is required', () => {
    expect(validateListInput({ title: '' })).toEqual({
      ok: false,
      errors: [{ field: 'title', code: 'required' }],
    });
  });

  test('trims the title', () => {
    expect(validateListInput({ title: ' House ' })).toEqual({ ok: true, value: { title: 'House' } });
  });
});

describe('field limits', () => {
  const tooLong = { ok: false, errors: [{ field: 'title', code: 'too-long' }] };

  test('the limits', () => {
    expect(MAX_TITLE_LENGTH).toBe(500);
    expect(MAX_TEXT_LENGTH).toBe(100_000);
  });

  test('a 501 code point title is too long, 500 is ok', () => {
    expect(validateTaskInput({ title: 'x'.repeat(501) })).toEqual(tooLong);
    expect(validateListInput({ title: 'x'.repeat(501) })).toEqual(tooLong);
    expect(validateTaskInput({ title: 'x'.repeat(500) }).ok).toBe(true);
    expect(validateListInput({ title: 'x'.repeat(500) }).ok).toBe(true);
  });

  test('500 emoji (1,000 UTF-16 units) is ok, 501 is too long', () => {
    expect(validateTaskInput({ title: '😀'.repeat(500) }).ok).toBe(true);
    expect(validateTaskInput({ title: '😀'.repeat(501) })).toEqual(tooLong);
  });

  test('the title is trimmed before counting', () => {
    expect(validateTaskInput({ title: '  ' + 'x'.repeat(500) + '  ' }).ok).toBe(true);
    expect(validateListInput({ title: '  ' + 'x'.repeat(500) + '  ' }).ok).toBe(true);
  });

  test('notes of 100,001 code points are too long, 100,000 is ok', () => {
    expect(validateTaskInput({ title: 'a', notes: 'n'.repeat(100_001) })).toEqual({
      ok: false,
      errors: [{ field: 'notes', code: 'too-long' }],
    });
    expect(validateTaskInput({ title: 'a', notes: 'n'.repeat(100_000) }).ok).toBe(true);
  });
});

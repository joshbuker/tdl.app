import { describe, expect, test } from 'vitest';
import { validateListInput, validateTaskInput } from '../src/validation.ts';

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

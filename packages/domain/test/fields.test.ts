import { describe, expect, test } from 'vitest';
import { validateField } from '../src/fields.ts';

describe('validateField', () => {
  test('normalizes titles', () => {
    expect(validateField('task', 'title', '  Buy milk ')).toEqual({ ok: true, value: 'Buy milk' });
    expect(validateField('list', 'title', ' Home ')).toEqual({ ok: true, value: 'Home' });
  });

  test('rejects blank and non-string titles', () => {
    expect(validateField('task', 'title', ' ')).toEqual({ ok: false, errors: [{ field: 'title', code: 'required' }] });
    expect(validateField('list', 'title', 5)).toEqual({ ok: false, errors: [{ field: 'title', code: 'required' }] });
  });

  test('completedAt is null or an ISO UTC instant', () => {
    expect(validateField('task', 'completedAt', '2026-11-11T10:00:00Z').ok).toBe(true);
    expect(validateField('task', 'completedAt', '2026-11-11T10:00:00.123Z').ok).toBe(true);
    expect(validateField('task', 'completedAt', null)).toEqual({ ok: true, value: null });
    expect(validateField('task', 'completedAt', 'yesterday')).toEqual({
      ok: false,
      errors: [{ field: 'completedAt', code: 'invalid' }],
    });
    expect(validateField('task', 'completedAt', '2026-02-31T10:00:00Z').ok).toBe(false);
  });

  test('notes and reason are strings', () => {
    expect(validateField('task', 'notes', 'x')).toEqual({ ok: true, value: 'x' });
    expect(validateField('link', 'reason', 3)).toEqual({ ok: false, errors: [{ field: 'reason', code: 'invalid' }] });
  });

  test('link kind is hard or soft', () => {
    expect(validateField('link', 'kind', 'soft')).toEqual({ ok: true, value: 'soft' });
    expect(validateField('link', 'kind', 'strong')).toEqual({ ok: false, errors: [{ field: 'kind', code: 'invalid' }] });
  });

  test('editorsCanShare is a boolean', () => {
    expect(validateField('list', 'editorsCanShare', true)).toEqual({ ok: true, value: true });
    expect(validateField('list', 'editorsCanShare', 'yes')).toEqual({
      ok: false,
      errors: [{ field: 'editorsCanShare', code: 'invalid' }],
    });
  });

  test('unknown fields are rejected', () => {
    expect(validateField('task', 'colour', 'x')).toEqual({ ok: false, errors: [{ field: 'colour', code: 'unknown-field' }] });
    expect(validateField('list', 'notes', 'x').ok).toBe(false);
  });
});

import type { LinkKind } from './model.ts';
import { MAX_TEXT_LENGTH, MAX_TITLE_LENGTH, exceedsLength, normalizeTitle, type FieldError, type Validated } from './validation.ts';

const ISO_UTC = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?Z$/;

function isIsoUtcInstant(value: string): boolean {
  const m = ISO_UTC.exec(value);
  if (m === null) return false;
  const [year, month, day, hour, minute, second] = m.slice(1, 7).map(Number) as [number, number, number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    hour < 24 &&
    minute < 60 &&
    second < 60
  );
}

const fail = (field: string, code: FieldError['code']): Validated<unknown> => ({ ok: false, errors: [{ field, code }] });
const ok = (value: unknown): Validated<unknown> => ({ ok: true, value });

function title(field: string, value: unknown): Validated<unknown> {
  if (typeof value !== 'string') return fail(field, 'required');
  const normalized = normalizeTitle(value);
  if (normalized === '') return fail(field, 'required');
  return exceedsLength(normalized, MAX_TITLE_LENGTH) ? fail(field, 'too-long') : ok(normalized);
}

function text(field: string, value: unknown): Validated<unknown> {
  if (typeof value !== 'string') return fail(field, 'invalid');
  return exceedsLength(value, MAX_TEXT_LENGTH) ? fail(field, 'too-long') : ok(value);
}

/** Validates and normalizes one field value for a record type. Returns the normalized value or field errors. */
export function validateField(type: 'list' | 'task' | 'link', field: string, value: unknown): Validated<unknown> {
  const key = `${type}.${field}`;
  switch (key) {
    case 'list.title':
    case 'task.title':
      return title(field, value);
    case 'task.notes':
    case 'link.reason':
      return text(field, value);
    case 'task.completedAt':
      if (value === null) return ok(null);
      return typeof value === 'string' && isIsoUtcInstant(value) ? ok(value) : fail(field, 'invalid');
    case 'list.editorsCanShare':
      return typeof value === 'boolean' ? ok(value) : fail(field, 'invalid');
    case 'link.kind':
      return value === ('hard' satisfies LinkKind) || value === ('soft' satisfies LinkKind) ? ok(value) : fail(field, 'invalid');
    default:
      return fail(field, 'unknown-field');
  }
}

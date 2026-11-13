export interface FieldError {
  field: string;
  code:
    | 'required'
    | 'invalid'
    | 'unknown-field'
    | 'too-short'
    | 'too-long'
    | 'whitespace'
    | 'uppercase'
    | 'taken'
    | 'already-shared'
    | 'forbidden';
}

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };

export const MAX_TITLE_LENGTH = 500;
export const MAX_TEXT_LENGTH = 100_000;

/** True when `value` has more than `max` code points (not UTF-16 units). */
export function exceedsLength(value: string, max: number): boolean {
  // A string of at most `max` UTF-16 units can't have more than `max` code points.
  if (value.length <= max) return false;
  let count = 0;
  for (let i = 0; i < value.length; i++) {
    count++;
    const unit = value.charCodeAt(i);
    // A high surrogate followed by a low surrogate is one code point.
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) i++;
    }
  }
  return count > max;
}

/** Trims leading and trailing whitespace (including Unicode spaces), and nothing else. */
export function normalizeTitle(raw: string): string {
  return raw.trim();
}

export function validateTaskInput(input: {
  title: string;
  notes?: string;
}): Validated<{ title: string; notes: string }> {
  const title = normalizeTitle(input.title);
  if (title === '') return { ok: false, errors: [{ field: 'title', code: 'required' }] };
  const errors: FieldError[] = [];
  if (exceedsLength(title, MAX_TITLE_LENGTH)) errors.push({ field: 'title', code: 'too-long' });
  const notes = input.notes ?? '';
  if (exceedsLength(notes, MAX_TEXT_LENGTH)) errors.push({ field: 'notes', code: 'too-long' });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { title, notes } };
}

export function validateListInput(input: { title: string }): Validated<{ title: string }> {
  const title = normalizeTitle(input.title);
  if (title === '') return { ok: false, errors: [{ field: 'title', code: 'required' }] };
  if (exceedsLength(title, MAX_TITLE_LENGTH)) return { ok: false, errors: [{ field: 'title', code: 'too-long' }] };
  return { ok: true, value: { title } };
}

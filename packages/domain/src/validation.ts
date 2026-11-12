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
  return { ok: true, value: { title, notes: input.notes ?? '' } };
}

export function validateListInput(input: { title: string }): Validated<{ title: string }> {
  const title = normalizeTitle(input.title);
  if (title === '') return { ok: false, errors: [{ field: 'title', code: 'required' }] };
  return { ok: true, value: { title } };
}

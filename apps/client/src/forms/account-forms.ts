import { ApiError } from '@tdl/app-core';
import { NetworkError } from '@tdl/sync';
import type { AppViewState } from '../composables/useApp.ts';

import enUS from '../i18n/en-US.json';

/** Translation keys of a form's errors: one for the form as a whole, and one per field. */
export interface FormErrors {
  form: string | null;
  fields: Partial<Record<string, string>>;
}

/**
 * The translation key for an error code. Codes are open-ended (the server passes some through
 * from Better Auth), so one without a translation shows `errors.unknown`.
 */
export function errorKey(code: string): string {
  return Object.hasOwn(enUS.errors, code) ? `errors.${code}` : 'errors.unknown';
}

/**
 * What a form shows for a failed request: each field error on its field (the first, if a field
 * has several), and anything else on the form.
 */
export function formErrors(error: unknown, fieldNames: readonly string[]): FormErrors {
  if (error instanceof NetworkError) return { form: 'errors.network', fields: {} };
  if (!(error instanceof ApiError)) return { form: 'errors.unknown', fields: {} };
  if (error.errors === undefined || error.errors.length === 0) {
    return { form: errorKey(error.code), fields: {} };
  }
  const fields: Partial<Record<string, string>> = {};
  let form: string | null = null;
  for (const { field, code } of error.errors) {
    if (!fieldNames.includes(field)) form ??= errorKey(code);
    else fields[field] ??= errorKey(code);
  }
  return { form, fields };
}

/**
 * Whether the login and sign-up forms may call the app core. Only when logged out: while the app
 * is starting the tab lock may not be held yet, and logging in would open the store without it.
 */
export function canSubmitAccountForm(state: AppViewState): boolean {
  return state.kind === 'logged-out';
}

import type { FieldError, Validated } from './validation.ts';

export interface AccountInput {
  username: string;
  email: string;
  password: string;
  givenName: string;
  familyName: string;
}

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Rules from docs/features/account/user-validation.md. Uniqueness is checked elsewhere. */
export function validateAccountInput(input: AccountInput): Validated<AccountInput> {
  const errors: FieldError[] = [];
  const add = (field: string, code: FieldError['code']): void => {
    errors.push({ field, code });
  };

  if (input.username === '') add('username', 'required');
  else if (Array.from(input.username).length > 69) add('username', 'too-long');
  else if (/\s/u.test(input.username)) add('username', 'whitespace');

  if (input.email === '') add('email', 'required');
  else if (!EMAIL.test(input.email)) add('email', 'invalid');
  else if (input.email !== input.email.toLowerCase()) add('email', 'uppercase');

  const passwordLength = Array.from(input.password).length;
  if (passwordLength < 14) add('password', 'too-short');
  else if (passwordLength > 128) add('password', 'too-long');

  const givenName = input.givenName.trim();
  const familyName = input.familyName.trim();
  if (givenName === '') add('givenName', 'required');
  if (familyName === '') add('familyName', 'required');

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { ...input, givenName, familyName } };
}

import type { FieldError, LinkRejection } from '@tdl/domain';
import { pushResultSchema, type ReplicaStatus } from '@tdl/sync';
import { describe, expect, test } from 'vitest';

import enUS from './en-US.json';

// Codes from unions that exist only as types are listed as object keys: `satisfies Record<…>`
// fails typecheck when the union gains a code the list lacks, or the list has one it doesn't.
const fieldErrorCodes = Object.keys({
  required: true,
  invalid: true,
  'unknown-field': true,
  'too-short': true,
  'too-long': true,
  whitespace: true,
  uppercase: true,
  taken: true,
  'already-shared': true,
  forbidden: true,
} satisfies Record<FieldError['code'], true>);

const linkRejectionCodes = Object.keys({
  self: true,
  'not-editable': true,
  exists: true,
  cycle: true,
  redundant: true,
} satisfies Record<LinkRejection['code'], true>);

const replicaStatuses = Object.keys({
  ok: true,
  offline: true,
  'logged-out': true,
  revoked: true,
  stuck: true,
  'app-outdated': true,
  'server-outdated': true,
} satisfies Record<ReplicaStatus, true>);

const pushRejectionCodes = pushResultSchema.options[1].shape.code.options;

// `ApiError.code` is a plain string: these are the codes the server's routes send
// (apps/server/src), plus app-core's own `unknown` (no error body) and `different-user`.
const apiErrorCodes = [
  'bad-request',
  'different-user',
  'duplicate-link',
  'forbidden',
  'internal-error',
  'invalid',
  'invalid-credentials',
  'not-found',
  'protocol-mismatch',
  'rate-limited',
  'session-expired',
  'session-revoked',
  'unknown',
];

const errors: Record<string, string> = enUS.errors;
const status: Record<string, string> = enUS.status;

describe('translation keys', () => {
  test.each([
    ...new Set([
      ...fieldErrorCodes,
      ...linkRejectionCodes,
      ...pushRejectionCodes,
      ...apiErrorCodes,
    ]),
  ])('errors.%s exists', (code) => {
    expect(errors[code]).toBeTypeOf('string');
  });

  test.each(replicaStatuses)('status.%s exists', (replicaStatus) => {
    expect(status[replicaStatus]).toBeTypeOf('string');
  });
});

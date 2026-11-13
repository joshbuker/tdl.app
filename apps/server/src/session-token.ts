import { createHash } from 'node:crypto';
import { getSessionCookie } from 'better-auth/cookies';

export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * The raw session token a request presents: the bearer value, else the session cookie. Both may be
 * signed as `token.signature`; the raw token is the part before the first `.`.
 */
export function presentedToken(headers: Headers): string | null {
  const authorization = headers.get('authorization');
  let value: string | null = null;
  if (authorization !== null && authorization.slice(0, 7).toLowerCase() === 'bearer ') value = authorization.slice(7).trim();
  value ??= getSessionCookie(headers);
  if (value === null || value === '') return null;
  const token = decode(value).split('.')[0] ?? '';
  return token === '' ? null : token;
}

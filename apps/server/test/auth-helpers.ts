import { PROTOCOL_HEADER, PROTOCOL_VERSION } from '@tdl/sync';
import type { FastifyInstance } from 'fastify';

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  username: string;
  givenName: string;
  familyName: string;
  acceptTerms: unknown;
}

export const PASSWORD = 'correct horse battery';

export const signUpInput = (username: string, overrides: Partial<SignUpInput> = {}): SignUpInput => ({
  email: `${username.toLowerCase()}@example.com`,
  password: PASSWORD,
  name: `${username} Example`,
  username,
  givenName: username,
  familyName: 'Example',
  acceptTerms: true,
  ...overrides,
});

export function signUpRequest(app: FastifyInstance, payload: Record<string, unknown>, userAgent = 'test') {
  return app.inject({ method: 'POST', url: '/api/auth/sign-up/email', headers: { 'user-agent': userAgent }, payload });
}

/** Signs up and returns the bearer token. */
export async function signUp(app: FastifyInstance, username: string, overrides: Partial<SignUpInput> = {}): Promise<string> {
  const response = await signUpRequest(app, { ...signUpInput(username, overrides) });
  if (response.statusCode !== 200) throw new Error(`sign-up failed: ${String(response.statusCode)} ${response.body}`);
  return bearerOf(response.headers);
}

export function logIn(app: FastifyInstance, username: string, password = PASSWORD, userAgent = 'test') {
  return app.inject({
    method: 'POST',
    url: '/api/auth/sign-in/username',
    headers: { 'user-agent': userAgent },
    payload: { username, password },
  });
}

export function bearerOf(headers: Record<string, unknown>): string {
  const token = headers['set-auth-token'];
  if (typeof token !== 'string' || token === '') throw new Error('no set-auth-token header');
  return token;
}

/** The protocol version header every sync request needs. */
export const protocol = { [PROTOCOL_HEADER]: PROTOCOL_VERSION };

/** A bearer token, with the protocol version so the headers also suit sync routes. */
export const auth = (token: string) => ({ authorization: `Bearer ${token}`, ...protocol });

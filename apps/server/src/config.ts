import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  ORIGIN: z.url(),
  AUTH_SECRET: z.string().min(32),
  TRUST_PROXY: booleanString.default(false),
  WEB_ROOT: z.string().min(1).optional(),
  APP_ORIGINS: z.string().default('https://localhost,capacitor://localhost,tdl://app'),
});

export interface Config {
  databaseUrl: string;
  port: number;
  /** The public URL of the app, e.g. https://tdl.app. */
  origin: string;
  authSecret: string;
  trustProxy: boolean;
  /**
   * The origins the native apps' windows run at (Capacitor's, Electron's). They may open the
   * live-update socket with a token, and make cross-origin API requests, but never use cookies.
   */
  appOrigins: string[];
  /** A folder holding the built web app. When set, the server serves it from its own origin. */
  webRoot?: string;
}

/**
 * An origin in one canonical form, so comparing strings works: trimmed, without one trailing `/`,
 * and lower-cased (the scheme and host are case-insensitive; an origin has no path). Not
 * `URL.origin`, which gives `"null"` for schemes like `tdl:` and `capacitor:`.
 */
export function normaliseOrigin(value: string): string {
  const trimmed = value.trim();
  return (trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed).toLowerCase();
}

/** Parses the environment. Throws an error naming every missing or invalid variable. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Invalid configuration: ${names.join(', ')}`);
  }
  const { DATABASE_URL, PORT, ORIGIN, AUTH_SECRET, TRUST_PROXY, APP_ORIGINS, WEB_ROOT } = parsed.data;
  return {
    databaseUrl: DATABASE_URL,
    port: PORT,
    origin: normaliseOrigin(ORIGIN),
    authSecret: AUTH_SECRET,
    trustProxy: TRUST_PROXY,
    appOrigins: APP_ORIGINS.split(',')
      .map(normaliseOrigin)
      .filter((origin) => origin !== ''),
    ...(WEB_ROOT === undefined ? {} : { webRoot: WEB_ROOT }),
  };
}

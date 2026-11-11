import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  ORIGIN: z.url(),
  AUTH_SECRET: z.string().min(32),
  TRUST_PROXY: booleanString.default(false),
});

export interface Config {
  databaseUrl: string;
  port: number;
  /** The public URL of the app, e.g. https://tdl.app. */
  origin: string;
  authSecret: string;
  trustProxy: boolean;
}

/** Parses the environment. Throws an error naming every missing or invalid variable. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Invalid configuration: ${names.join(', ')}`);
  }
  const { DATABASE_URL, PORT, ORIGIN, AUTH_SECRET, TRUST_PROXY } = parsed.data;
  return { databaseUrl: DATABASE_URL, port: PORT, origin: ORIGIN, authSecret: AUTH_SECRET, trustProxy: TRUST_PROXY };
}

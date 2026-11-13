import type { HttpTransportOptions, JsonValue, ReplicaStore, Transport } from '@tdl/sync';

/** Small app values kept on the device beside the replica. The same shape as `@tdl/device-store`'s. */
export interface KeyValue {
  /** The stored value, or null if there is none. */
  get(key: string): Promise<JsonValue | null>;
  set(key: string, value: JsonValue): Promise<void>;
  /** Removes every value. */
  clear(): Promise<void>;
}

/** A KeyValue in memory, for tests and headless use. */
export class MemoryKeyValue implements KeyValue {
  private readonly values = new Map<string, string>();

  get(key: string): Promise<JsonValue | null> {
    const text = this.values.get(key);
    return Promise.resolve(text === undefined ? null : (JSON.parse(text) as JsonValue));
  }

  set(key: string, value: JsonValue): Promise<void> {
    // Stored as JSON, so later changes to `value` don't reach the stored copy.
    this.values.set(key, JSON.stringify(value));
    return Promise.resolve();
  }

  clear(): Promise<void> {
    this.values.clear();
    return Promise.resolve();
  }
}

/** What each app (web, Android, desktop) supplies to the app core. */
export interface Platform {
  /** `cookie`: the browser sends the session cookie (web). `token`: a bearer token the app keeps (native). */
  readonly auth: 'cookie' | 'token';
  /** The device's durable storage: the replica, and small values beside it. */
  openStore(): Promise<{ replicaStore: ReplicaStore; keyValue: KeyValue }>;
  /** The stored session token, or null. Cookie platforms return null. */
  loadToken(): Promise<string | null>;
  /** Stores the session token, or forgets it with null. Cookie platforms ignore it. */
  saveToken(token: string | null): Promise<void>;
  /** The sync transport, usually `createHttpTransport(options)`. */
  transport(options: HttpTransportOptions): Transport;
}

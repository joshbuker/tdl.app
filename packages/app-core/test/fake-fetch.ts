import type { FetchLike } from '@tdl/sync';

export const BASE_URL = 'https://tdl.test';

export type FetchInit = Parameters<FetchLike>[1];

export interface FakeReply {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface FetchCall {
  url: string;
  init: FetchInit;
}

/**
 * A scripted server: replies are looked up by `METHOD /path` (without the query). A route
 * without a reply, or any route while `online` is false, fails the way fetch does offline.
 */
export class FakeFetch {
  online = true;
  readonly calls: FetchCall[] = [];
  private readonly routes = new Map<string, FakeReply>();
  private readonly baseUrl: string;

  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  on(route: string, reply: FakeReply): this {
    this.routes.set(route, reply);
    return this;
  }

  /** The calls made to `METHOD /path`. */
  callsTo(route: string): FetchCall[] {
    return this.calls.filter((call) => `${call.init.method} ${pathOf(call.url, this.baseUrl)}` === route);
  }

  readonly fetch: FetchLike = (url, init) => {
    this.calls.push({ url, init });
    const reply = this.routes.get(`${init.method} ${pathOf(url, this.baseUrl)}`);
    if (!this.online || reply === undefined) return Promise.reject(new TypeError('fetch failed'));
    const headers = new Map(Object.entries(reply.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    return Promise.resolve({
      status: reply.status,
      headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
      json: () => (reply.body === undefined ? Promise.reject(new SyntaxError('Unexpected end of JSON input')) : Promise.resolve(reply.body)),
    });
  };
}

const pathOf = (url: string, baseUrl: string): string => (url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url).split('?')[0] ?? '';

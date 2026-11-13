import type { Id } from '@tdl/domain';
import type { FeedEntry, JsonValue, Operation, PullPage, PushResult, RecordRef, UnknownEntry } from '../src/operations.ts';
import type { AuthoredOperation } from '../src/state.ts';
import { NetworkError, type Transport } from '../src/transport.ts';
import { PROTOCOL_VERSION } from '../src/version.ts';

type Rejection = Omit<Extract<PushResult, { status: 'rejected' }>, 'id' | 'status'>;

/**
 * An in-memory stand-in for the server. It only assigns sequence numbers and echoes every
 * operation to one shared feed: no access rules, no validation. Tests script rejections
 * through `reject`.
 */
export interface FakeServer {
  readonly entries: (FeedEntry | UnknownEntry)[];
  /** The size of every push call, in order. */
  readonly pushSizes: number[];
  reject: ((op: Operation) => Rejection | undefined) | undefined;
  /** Adds operations straight to the feed, as if another device had pushed them. */
  seed(...ops: AuthoredOperation[]): void;
  forget(record: RecordRef): void;
  /** Adds an entry as a newer server might send, which this version's schemas don't know. `raw.id` is set to the next feed ID. */
  seedUnknown(raw: { [key: string]: JsonValue }): void;
  transport(userId: Id): Transport;
}

export function createFakeServer(): FakeServer {
  const entries: (FeedEntry | UnknownEntry)[] = [];
  const results = new Map<Id, PushResult>();
  const listeners = new Set<(id: number) => void>();
  let seq = 0;

  const lastId = (): number => entries.at(-1)?.id ?? 0;
  const notify = (): void => {
    for (const listener of listeners) listener(lastId());
  };
  const append = (op: AuthoredOperation): number => {
    seq += 1;
    entries.push({ id: lastId() + 1, kind: 'op', op: { ...op, seq } });
    return seq;
  };

  const server: FakeServer = {
    entries,
    pushSizes: [],
    reject: undefined,
    seed(...ops) {
      for (const op of ops) append(op);
      notify();
    },
    forget(record) {
      entries.push({ id: lastId() + 1, kind: 'forget', record });
      notify();
    },
    seedUnknown(raw) {
      const id = lastId() + 1;
      entries.push({ kind: 'unknown', id, raw: { ...raw, id } });
      notify();
    },
    transport(userId) {
      return {
        push(ops) {
          server.pushSizes.push(ops.length);
          const out = ops.map((op): PushResult => {
            const earlier = results.get(op.id);
            if (earlier !== undefined) return earlier;
            const rejection = server.reject?.(op);
            const result: PushResult =
              rejection === undefined
                ? { id: op.id, status: 'accepted', seq: append({ ...op, authorId: userId }) }
                : { id: op.id, status: 'rejected', ...rejection };
            results.set(op.id, result);
            return result;
          });
          notify();
          return Promise.resolve(out);
        },
        pull(after, limit) {
          const newer = entries.filter((e) => e.id > after);
          const page = newer.slice(0, limit);
          return Promise.resolve({ entries: page, cursor: page.at(-1)?.id ?? after, more: newer.length > limit });
        },
        subscribe(onFeed) {
          listeners.add(onFeed);
          return () => listeners.delete(onFeed);
        },
        serverVersion: () => PROTOCOL_VERSION,
      };
    },
  };
  return server;
}

/** A transport whose every request fails with `error`. */
export function failing(error: Error): Transport {
  return {
    push: () => Promise.reject(error),
    pull: () => Promise.reject(error),
    subscribe: () => () => undefined,
    serverVersion: () => null,
  };
}

export const offline = (): Transport => failing(new NetworkError());

/** A transport that forwards to another, which tests can swap with `use`. */
export function switchable(initial: Transport): Transport & { use(next: Transport): void } {
  let inner = initial;
  return {
    use(next) {
      inner = next;
    },
    push: (ops) => inner.push(ops),
    pull: (after, limit) => inner.pull(after, limit),
    subscribe: (onFeed) => inner.subscribe(onFeed),
    serverVersion: () => inner.serverVersion(),
  };
}

/** Repeats the first page it pulls: once with `more` forced on, then again as it came. */
export function repeatFirstPage(inner: Transport): Transport {
  let first: PullPage | undefined;
  return {
    push: (ops) => inner.push(ops),
    async pull(after, limit) {
      if (first !== undefined) return first;
      first = await inner.pull(after, limit);
      return { ...first, more: true };
    },
    subscribe: (onFeed) => inner.subscribe(onFeed),
    serverVersion: () => inner.serverVersion(),
  };
}

// A Transport that loses, repeats and delays requests, for the conformance suite.
import { NetworkError, type Transport } from '@tdl/sync';

/** Fault probabilities, from 0 to 1, and the range of the delay before each call. */
export interface Faults {
  /** The request is lost before it reaches the server. */
  drop: number;
  /** The server handles the request, but its reply is lost. */
  dropReply: number;
  /** The request reaches the server twice. */
  duplicate: number;
  delayMs: [number, number];
}

export const NO_FAULTS: Faults = { drop: 0, dropReply: 0, duplicate: 0, delayMs: [0, 0] };

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Wraps `inner` with the faults, drawing from `rand`. The faults are read on every call, so the
 * caller can change them (e.g. `Object.assign(faults, NO_FAULTS)`) while the transport is in use.
 */
export function faulty(inner: Transport, rand: () => number, faults: Faults): Transport {
  const call = async <T>(send: () => Promise<T>): Promise<T> => {
    const [min, max] = faults.delayMs;
    await sleep(min + Math.floor(rand() * (max - min + 1)));
    if (rand() < faults.drop) throw new NetworkError();
    const first = await send();
    // The second reply is the one used, so it must be as good as the first.
    const reply = rand() < faults.duplicate ? await send() : first;
    if (rand() < faults.dropReply) throw new NetworkError();
    return reply;
  };
  return {
    push: (ops) => call(() => inner.push(ops)),
    pull: (after, limit) => call(() => inner.pull(after, limit)),
    subscribe: (onFeed) => inner.subscribe(onFeed),
    serverVersion: () => inner.serverVersion(),
  };
}

// Hybrid logical clock. Values are strings whose natural order is causal order,
// with ties broken by node ID: `${ms (15)}:${counter (6)}:${nodeId}`.
export interface Clock {
  tick(): string;
  receive(remote: string): void;
}

const format = (ms: number, counter: number, nodeId: string): string =>
  `${String(ms).padStart(15, '0')}:${String(counter).padStart(6, '0')}:${nodeId}`;

function parse(hlc: string): { ms: number; counter: number } | null {
  const [ms, counter] = hlc.split(':');
  const parsedMs = Number(ms);
  const parsedCounter = Number(counter);
  if (!Number.isSafeInteger(parsedMs) || !Number.isSafeInteger(parsedCounter)) return null;
  return { ms: parsedMs, counter: parsedCounter };
}

/** `now` returns milliseconds since the epoch (Date.now-style). */
export function createClock(nodeId: string, now: () => number): Clock {
  let lastMs = 0;
  let lastCounter = -1;

  return {
    tick() {
      const wall = now();
      if (wall > lastMs) {
        lastMs = wall;
        lastCounter = 0;
      } else {
        lastCounter += 1;
      }
      return format(lastMs, lastCounter, nodeId);
    },
    receive(remote) {
      const parsed = parse(remote);
      if (parsed === null) return;
      if (parsed.ms > lastMs || (parsed.ms === lastMs && parsed.counter > lastCounter)) {
        lastMs = parsed.ms;
        lastCounter = parsed.counter;
      }
    },
  };
}

export function compareHlc(a: string, b: string): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

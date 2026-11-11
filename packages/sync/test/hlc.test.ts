import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { compareHlc, createClock } from '../src/hlc.ts';

describe('createClock', () => {
  test('ticks with a frozen clock are strictly increasing', () => {
    const clock = createClock('node-a', () => 1_000);
    let previous = clock.tick();
    for (let i = 0; i < 1000; i++) {
      const next = clock.tick();
      expect(next > previous).toBe(true);
      previous = next;
    }
  });

  test('formats as padded ms, counter and node id', () => {
    const clock = createClock('node-a', () => 42);
    expect(clock.tick()).toBe('000000000000042:000000:node-a');
    expect(clock.tick()).toBe('000000000000042:000001:node-a');
  });

  test('the next tick after receiving a remote value 10 s ahead is greater than it', () => {
    const clock = createClock('node-a', () => 1_000);
    const remote = createClock('node-b', () => 11_000).tick();
    clock.receive(remote);
    expect(clock.tick() > remote).toBe(true);
  });

  test('ticks still increase when the wall clock goes backwards', () => {
    const times = [5_000, 4_000, 3_000, 3_000, 9_000, 1_000];
    let i = 0;
    const clock = createClock('node-a', () => times[i++] ?? 0);
    let previous = clock.tick();
    for (let n = 1; n < times.length; n++) {
      const next = clock.tick();
      expect(next > previous).toBe(true);
      previous = next;
    }
  });

  test('at the same instant the node id breaks ties', () => {
    const a = createClock('node-a', () => 1_000).tick();
    const b = createClock('node-b', () => 1_000).tick();
    expect(a < b).toBe(true);
    expect(compareHlc(a, b)).toBe(-1);
    expect(compareHlc(b, a)).toBe(1);
    expect(compareHlc(a, a)).toBe(0);
  });

  test('outputs are strictly increasing for any interleaving of tick and receive', () => {
    const step = fc.oneof(
      fc.record({ kind: fc.constant('tick' as const), wall: fc.integer({ min: 0, max: 100_000 }) }),
      fc.record({
        kind: fc.constant('receive' as const),
        wall: fc.integer({ min: 0, max: 100_000 }),
        remoteMs: fc.integer({ min: 0, max: 200_000 }),
        remoteCounter: fc.integer({ min: 0, max: 50 }),
      }),
    );
    fc.assert(
      fc.property(fc.array(step, { maxLength: 100 }), (steps) => {
        let wall = 0;
        const clock = createClock('node-a', () => wall);
        let previous = '';
        for (const s of steps) {
          wall = s.wall;
          if (s.kind === 'receive') {
            const remote = `${String(s.remoteMs).padStart(15, '0')}:${String(s.remoteCounter).padStart(6, '0')}:node-b`;
            clock.receive(remote);
            previous = previous > remote ? previous : remote;
          } else {
            const next = clock.tick();
            expect(next > previous).toBe(true);
            previous = next;
          }
        }
      }),
    );
  });
});

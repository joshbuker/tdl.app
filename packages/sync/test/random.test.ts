import { describe, expect, test } from 'vitest';
import { seededRandom } from '../src/random.ts';

describe('seededRandom', () => {
  test('the same seed gives the same first 5 numbers', () => {
    const a = seededRandom(123);
    const b = seededRandom(123);
    const first = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(first);
    expect(new Set(first).size).toBe(5);
  });

  test('different seeds differ', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });

  test('all values are in [0, 1)', () => {
    const random = seededRandom(7);
    for (let i = 0; i < 10_000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

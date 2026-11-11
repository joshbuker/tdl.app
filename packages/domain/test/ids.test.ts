import { expect, test } from 'vitest';
import { newId } from '../src/ids.ts';

test('newId returns a UUIDv7', () => {
  expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('IDs made one after another sort in creation order', () => {
  const ids = Array.from({ length: 100 }, () => newId());
  expect([...ids].sort()).toEqual(ids);
});

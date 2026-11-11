import { expect, test } from 'vitest';
import * as domain from '../src/index.ts';

test('the domain package loads', () => {
  expect(domain).toBeTypeOf('object');
});

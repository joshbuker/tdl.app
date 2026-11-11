import { afterAll, beforeAll, expect, test } from 'vitest';
import { testApp } from './db.ts';

let server: Awaited<ReturnType<typeof testApp>>;
beforeAll(async () => {
  server = await testApp();
});
afterAll(async () => {
  await server.close();
});

test('the OpenAPI document matches the stored snapshot', async () => {
  await server.app.ready();
  expect(server.app.swagger()).toMatchSnapshot();
});

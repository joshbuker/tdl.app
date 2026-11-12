import closeWithGrace from 'close-with-grace';
import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createDb, runMigrations } from './db/client.ts';

const config = loadConfig(process.env);
const { db, close } = createDb(config.databaseUrl);
await runMigrations(db);
const app = await buildApp(config, { db });

closeWithGrace({ delay: 10_000 }, async () => {
  await app.close();
  await close();
});

await app.listen({ port: config.port, host: '0.0.0.0' });

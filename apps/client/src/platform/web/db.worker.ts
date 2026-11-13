// The web app's database: SQLite Wasm, kept in the origin private file system by the
// `opfs-sahpool` VFS, which needs a worker but no COOP or COEP headers.
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {
  errorMessage,
  handleSqlRequest,
  type SqlRequest,
  type SqlResponse,
} from './sql-protocol.ts';

const opening = (async () => {
  const sqlite3 = await sqlite3InitModule();
  const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'tdl-app' });
  return new pool.OpfsSAHPoolDb('/tdl-app.sqlite3');
})();

const reply = (response: SqlResponse): void => {
  self.postMessage(response);
};

// Requests that arrive while the database opens wait for it, in order.
self.addEventListener('message', (event: MessageEvent<SqlRequest>) => {
  const request = event.data;
  opening.then(
    (db) => {
      reply(handleSqlRequest(db, request));
    },
    (error: unknown) => {
      reply({ id: request.id, ok: false, message: errorMessage(error) });
    },
  );
});

# Custom sync

## Context

The app is offline first: every device keeps its own copy, and changes sync in the background (see [Offline first](offline-first.md) and [Offline use](../features/app/offline.md)). Sync must:

- let the server check every change against the sharing grants (see [Container and item grants](container-and-item-grants.md));
- merge field by field;
- keep the full change history forever;
- push live updates to open apps;
- in v2, carry end-to-end encrypted content with plaintext routing metadata (see [End-to-end encryption](end-to-end-encryption.md));
- in v2, serve servers as well as devices (see [Federation reuses sync](federation-reuses-sync.md)).

The 2025 prototype stalled building an auth proxy around PouchDB and CouchDB. In late 2026, none of the sync engines that are free and AGPL-compatible met all of these needs:

- **Zero** doesn't allow offline writes.
- **Evolu** can't check grants on the server.
- **PowerSync** needs Postgres plus extra services, and gates some write features to paid tiers.
- **Jazz 2** is alpha.
- **Syncular**, the closest match, is pre-1.0 with one maintainer.

## Decision

Sync is our own small protocol, built on well-established parts:

- Each change is an operation on one field of one record, stamped with a hybrid logical clock (a timestamp that orders changes correctly across devices). Operations wait in an outbox on the device until the server accepts them.
- The server checks each operation against the grants, gives accepted ones a sequence number, stores them forever, and tells open apps over a websocket that there is something new. Devices pull everything after the last sequence number they have.
- Merging is newest-wins per field, as described in [Offline use](../features/app/offline.md). Text merging for notes in v2 uses a CRDT library (e.g. Yjs or Loro).
- Each operation separates its content from its routing metadata, so content can be encrypted in v2 without changing what the server routes on. From v1, the plaintext metadata is exactly the list under "Visible to the server" in [End-to-end encryption](end-to-end-encryption.md): record IDs, the owning account, each task's list, the two tasks a link joins, grants and roles, trash time, attachment records and sizes, and notification recipients. Everything else, including a link's kind and reason, is content. The server reads only metadata to route, authorize and do housekeeping.
- Devices store data in SQLite: the official SQLite WebAssembly build on the web, a Capacitor SQLite plugin on Android and iOS, and native SQLite in Electron. A reactive store (e.g. TanStack DB) sits on top for the UI.
- The protocol is written down as a spec with a conformance test suite, following the example of Syncular's spec and Linear's published sync design.

Sync, login and sharing are proven first, as a thin slice from device to server and back, before feature work (see [Lessons from previous attempts](../lessons-from-previous-attempts.md)).

## Alternatives considered

- **Syncular**: Apache-2.0, server-authoritative, works with SQLite or Postgres, with column encryption and Yjs support. The closest design, but pre-1.0, one maintainer and nine months old. Its spec is used as a blueprint, and it can be revisited if it matures.
- **PowerSync**: mature and Apache-2.0 since November 2026, but needs Postgres with replication plus its own service, gates some write features to paid tiers, and has no path to encryption or federation.
- **Jazz 2**: MIT, with server-enforced permissions and history, but alpha, with data imports between versions.
- **Electric, Zero and other server-reads-everything engines**: no offline writes, or no path to encryption.
- **A CRDT library for every record** (Automerge, Yjs, Loro): heavier documents, and history and server routing are harder to control.

## Consequences

- An estimated 3,000 to 6,000 lines of TypeScript to build and own. The hard parts are partial sync when grants change, the first full download to a new device, and testing under network faults, not the merging.
- Sync gets a deterministic test harness that injects network faults, from the first slice.
- One protocol for devices, servers and the API client library.

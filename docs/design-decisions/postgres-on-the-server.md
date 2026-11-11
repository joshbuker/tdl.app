# Postgres on the server

## Context

The server stores the sync operation log, the sharing grants, accounts and sessions, and attachment metadata (see [Custom sync](custom-sync.md)). It checks each operation against the grants and pushes changes to open apps. Devices store their copy in SQLite. #1 to #3 used Postgres. Self-hosting must stay simple, with documented backup and restore (see [Self-hosting](self-hosting.md) and [Server backups](server-backups.md)).

## Decision

The server uses **PostgreSQL**. Devices use SQLite. The two never share SQL: the sync protocol is the boundary between them, and domain logic works on plain TypeScript data rather than queries.

- Flexible payloads (e.g. operation values) use JSONB columns.
- Any graph walk the server needs (e.g. grant inheritance, or the v2 outline role's placeholders) uses recursive queries (`WITH RECURSIVE`).
- Self-hosting ships as two containers, the server and Postgres, with a Compose file and documented backup and restore.

## Alternatives considered

- **SQLite with Litestream**: one container plus a backup sidecar, and the same SQL dialect as the devices. Simpler for self-hosters, but it handles fewer simultaneous writers, and Litestream's backup format changed in 2025.
- **Supporting both**: self-hosters choose, but every query and migration would be tested twice.
- **Graph databases** (Neo4j, Memgraph, ArangoDB, SurrealDB, Kùzu and its forks, FalkorDB, JanusGraph, Dgraph, ArcadeDB): the server never walks the task graph; graph rules run on the device in shared TypeScript (see [Offline first](offline-first.md)). In late 2026 most were BSL or SSPL, Kùzu was abandoned, and the rest are Java-based or need extra services and their own backup tools. Apache AGE, a graph extension for Postgres, is the first thing to try if recursive queries ever fall short.
- **Document databases** (MongoDB, FerretDB, CouchDB, RavenDB, Couchbase, RxDB): MongoDB is SSPL, Couchbase is BSL, RavenDB has a limited free mode and RxDB charges for the storage we'd need. CouchDB's replication would need the grant-aware proxy that stalled the 2025 prototype. JSONB covers document-style data.

## Consequences

- Self-hosters run two containers, and back up Postgres with standard tools (e.g. `pg_dump`, or continuous WAL archiving for tdl.app).
- Server and device schemas are separate, and both are typed from the same domain types.
- Postgres's concurrency and features leave room to grow, including federation in v2.

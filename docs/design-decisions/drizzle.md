# Drizzle

## Context

The server stores data in Postgres and devices in SQLite (see [Postgres on the server](postgres-on-the-server.md) and [Custom sync](custom-sync.md)). Both need typed queries and schema migrations, and the schemas should be typed from the same domain types.

## Decision

Database access on the server and the devices uses **Drizzle** (Apache-2.0): schemas written in TypeScript, SQL-like typed queries, and migrations generated from the schema with drizzle-kit.

Drizzle 1.0 was still a release candidate in November 2026. The version is pinned to the release candidate until 1.0 is stable (see [Version pins](version-pins.md)).

## Alternatives considered

- **Kysely**: a stable, type-safe query builder, but types are hand-written or generated from the database, and migrations aren't generated from a schema.
- **Prisma 7**: a mature migration workflow, but its own schema language, a large bundle that's awkward on devices, and paid add-ons we wouldn't use.
- **MikroORM**: a full ORM, heavier than needed.

## Consequences

- One query library for Postgres and SQLite.
- Release candidate upgrades may break things until 1.0 is stable.

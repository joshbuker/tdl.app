# UUIDv7 IDs

## Context

Records get their IDs on the device, so they can be created and linked offline (see [Offline first](offline-first.md) and [IDs, not titles](ids-not-titles.md)). IDs must stay unique across every device and, from v2, across servers that federate (see [Federation reuses sync](federation-reuses-sync.md)). #1 to #3 used Rails' auto-increment integers, which only the server can hand out.

## Decision

Every record's ID is a **UUIDv7** (RFC 9562), generated where the record is created. Postgres stores them in its native `uuid` type; SQLite stores them as 16-byte blobs or text, as the device schema decides.

Federation identifies servers through addresses (e.g. `alice@tdl.example.com`), not through record IDs, so IDs don't change when records are shared across servers.

## Alternatives considered

- **ULID**: also time-ordered and 128-bit with a shorter text form, but not a standard, and Postgres has no native type for it.
- **Random UUIDv4**: unique, but random order makes database indexes slower and gives no rough creation order.
- **Server-qualified IDs** (e.g. URLs, as in ActivityPub): say where a record lives, but are long, and awkward if a list moves between servers.
- **Auto-increment integers** (#1 to #3): can't be generated offline.

## Consequences

- IDs reveal roughly when a record was created. That's acceptable, since the server sees sync times anyway.
- IDs never need rewriting after sync.

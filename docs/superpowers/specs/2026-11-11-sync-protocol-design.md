# Sync protocol design

Status: draft for plan 2 of the [thin slice](2026-11-10-thin-slice-design.md).

## Intent

Pin down the sync protocol the [Custom sync](../../design-decisions/custom-sync.md) decision describes, far enough to build the thin slice's server and a headless device engine against it, and to test both with a conformance suite. Anything the slice's scenarios don't need is left out.

## Records and fields

The slice syncs four record types. Each field is either **metadata**, which the server reads to route and authorize (the "Visible to the server" list in [End-to-end encryption](../../design-decisions/end-to-end-encryption.md)), or **content**, which only devices read and which v2 encrypts.

| Record | Metadata | Content |
| --- | --- | --- |
| List | owner (the creator), `editorsCanShare` | `title` |
| Task | `listId` | `title`, `notes`, `completedAt` |
| Link | `prerequisiteId`, `postrequisiteId` (fixed at creation) | `kind`, `reason` |
| Grant | user, target (list or task), role | none |

Every device and the server keep two separate things (see [Current state and history](../../design-decisions/current-state-and-history.md)):

- **Current state:** the records that exist now. Next up, the graph rules and access checks read only this.
- **History:** every operation ever accepted, kept forever unless its record is permanently deleted. Task history is built from it.

Each record's creation time is part of its current state, taken from the clock of the operation that created it. Removing a link or revoking a grant deletes it from current state. Its operations stay in history, and each link's operations record which two tasks it joined, so both tasks' history shows the link being added and removed. Linking the same tasks again later makes a new link.

## Operations

A device changes data only by creating operations:

```ts
interface Operation {
  id: Id;            // UUIDv7 made on the device. A retry reuses it, so pushing twice changes nothing.
  hlc: string;       // hybrid logical clock, compared as a string
  record: { type: 'list' | 'task' | 'link' | 'grant'; id: Id };
  meta: MetaChange | null;      // routing metadata, plaintext forever
  content: ContentChange | null; // { field, value }, encrypted from v2
}
```

Exactly one of `meta` and `content` is set. The metadata changes are:

- `createList`
- `createTask { listId }`
- `moveTask { listId }`
- `createLink { prerequisiteId, postrequisiteId }`
- `removeLink`
- `grant { userId, target, role }` and `revokeGrant`, both made only by the server (see Sharing below).

A content change sets one field to a JSON value. Creating a task is a `createTask` operation followed by a `title` operation in the same push.

**Hybrid logical clock.** The format is `<wall-clock ms, 15 digits>:<counter, 6 digits>:<device ID>`, so string order is clock order, and the device ID breaks ties. Devices follow the standard algorithm: they advance the clock on every local operation, and on every operation they receive.

The slice doesn't detect concurrent edits, so history doesn't yet mark an edit as overridden or flag a double completion. See "Detecting concurrent edits" in [Open items](../../open-items.md).

## Merging on the device

A device keeps every operation it has seen, so its state is always recomputed from them, never edited in place:

- **Confirmed** operations come from its feed.
- **Pending** operations sit in its outbox, in the order they were made.
- **Rejected** operations are kept with the server's reason, for the "couldn't sync" view.

The visible state merges confirmed and pending operations:

- Metadata comes from the metadata operations.
- Each content field takes the value of its operation with the highest HLC (newest wins).
- A link or grant with a `removeLink` or `revokeGrant` operation isn't in the state at all.

History for a task is the operations on the task and on any link that joined it, sorted by HLC.

When the server rejects an operation, the device moves it from pending to rejected and recomputes the state, which undoes the change locally. Nothing the user typed is lost.

**Forgetting.** A `forget` entry deletes the record from current state and drops its operations from history, along with those of any link that joined it. Losing access to a task means losing its history too. Permanent deletion, which the slice doesn't build, sends the same `forget` entry.

**Duplicate links.** If the server refuses a link because the same link already exists, the reply carries the existing link's ID. The device folds its link into that one: it re-sends the `kind` and `reason` values the user set (not defaults, which the device never sends, so folding can't overwrite a collaborator's values with them) as content operations on the existing link, keeping their original HLCs so newest-wins stays fair, and drops its own link. A link in the **opposite** direction isn't a duplicate. It forms a loop, which is kept and flagged ([Offline use](../../features/app/offline.md), "Links that together form a cycle").

## The server

**Storage** (Postgres, through Drizzle):

- An `operations` table that keeps every accepted operation, numbered by a global sequence. Operations are only removed when their record is permanently deleted, which the slice doesn't build.
- Current-state tables for authorization: lists, tasks, links and grants, holding only the metadata of records that exist now. Removing a link or revoking a grant deletes its row.
- A `feed` table: one row per user per operation they can see, plus `forget` rows.
- Better Auth's own tables, and a `revoked_sessions` tombstone table.

**Push:** `POST /api/sync/push` with a batch of operations. The reply has one result per operation, in order. Each operation is handled in its own transaction:

1. **Idempotency.** An operation ID the server already accepted returns its original result.
2. **Authorization**, using `@tdl/domain`'s resolver on the access data loaded for the records involved. The server uses its own stored metadata, never what the device claims.
   - `createList`: always allowed; the author becomes the owner.
   - `createTask`: `addTask` on the list.
   - `moveTask`: `canMoveTask`.
   - Task content: `edit`.
   - List content: list role of editor or above.
   - `createLink`, `removeLink` and link content: `edit` on both tasks.

   A record the user can't see is rejected as `not-found`, and one they can see but can't change as `forbidden` (see [Error contract](../../design-decisions/error-contract.md)).
3. **Validation** of content with the shared field validators (see [Strict validation](../../design-decisions/strict-validation.md)), rejected as `invalid` with field errors. This is one isolated step that v2 drops.
4. **Uniqueness.** `createLink` is rejected as `duplicate-link` if a link already runs between the same two tasks in the same direction (a unique index on the pair). The reply includes `existingLinkId`. An operation on a link or grant that no longer exists, such as an offline edit to a removed link's reason, is rejected as `not-found`, so the device shows it under "couldn't sync".
5. **Store and fan out.** Assign the next sequence number, update the metadata tables, and add a feed row for each user who can now see the record.
   - **Audience:** a list's audience is its owner and its list grantees. A task's audience is its list's audience plus its task grantees. A link's audience is everyone who can see both of its tasks.
   - **Visibility changes:** `grant`, `revokeGrant` and `moveTask` can change who sees which records. For each affected user, the server compares what they could see before and after. Records that became visible get all their earlier operations added to that user's feed. Records that stopped being visible get a `forget` row. Removed links whose two tasks just became visible are included too, so a new collaborator sees the same task history as everyone else.

The server never undoes a link for breaking a graph rule. Graph rules run on devices ([Offline first](../../design-decisions/offline-first.md)).

**Pull:** `GET /api/sync/pull?after=<feed id>&limit=<n>` returns the user's feed entries after the cursor, each an operation or a `forget` with the record's type and ID. It also returns the new cursor, and whether there's more. A pull also records when the session last synced.

**Live updates:** `GET /api/sync/ws` is a websocket. The server sends `{ "type": "feed", "id": <latest feed id> }` whenever the user's feed grows, and the device pulls. Notifications go out from within the server process. Running several server instances would need Postgres `LISTEN`/`NOTIFY`, which the slice doesn't need.

**Sessions:** a request whose session isn't valid gets 401 with one of two codes:

- `session-revoked`: the user revoked this device. The device deletes its local data, including pending operations.
- `session-expired`: the session ended any other way (expired, or logged out elsewhere). The device keeps everything and asks the user to log in again.

Revoking a session writes a tombstone, so the server can tell the two apart after Better Auth has deleted the session.

Sessions follow [Server-side sessions](../../design-decisions/server-side-sessions.md):

- The web app, on the server's own origin, uses an httpOnly cookie. Android and Electron send a bearer token (Better Auth's bearer plugin).
- A session expires after 90 days without use, with no fixed limit while it's in use (`expiresIn` 90 days, `updateAge` 1 day).
- Better Auth's cookie cache stays off, so a revoked session stops working on every request at once.

The websocket checks the session before upgrading, and checks the `Origin` header against the server's own origin, since cookies are sent cross-site. It also caps message size. (Superseded for token clients by [Live-update authentication](../../design-decisions/live-update-authentication.md).)

## Accounts and sharing (plain HTTP, online only)

These are handled by the server, not through sync, since they need it anyway ([Offline use](../../features/app/offline.md)):

- **Sign-up** (Better Auth, with its username plugin). It validates [Account details](../../features/account/user-validation.md), except the breached-password check, which is deferred. It records when the terms were accepted, and creates the user's Inbox list, through operations the server makes, as their default list.
- **Login** with a username or email address and password, **logout**, **listing sessions** with when each last synced, and **revoking** one.
- `GET /api/me` returns the user's ID, username and default list.
- **Invitations:** `POST /api/invitations { target, username, role }`, which the owner can always send, and editors only for a single task on a list that allows it. Then `GET /api/invitations`, `POST /api/invitations/:id/accept` and `POST /api/invitations/:id/decline`. Accepting creates a `grant` operation, made by the server.
- **Removing access:** `DELETE /api/grants/:id`, by the target's owner (removing a collaborator) or by the grantee (leaving). It creates a `revokeGrant` operation.

Server-made operations take their HLC from the server's clock, and record the acting user as their author.

## Packages

- `@tdl/domain`, extended with:
  - field validators;
  - the audience and visibility-change functions the server uses for fan-out. These are pure functions over `AccessData`, so the rules stay in one shared place.
- `@tdl/sync`, new, with:
  - the operation types and schemas;
  - the HLC;
  - the device engine (`Replica`): outbox, merging, history, rejected operations, duplicate-link folding, forgetting, and wiping on revocation;
  - a storage interface with an in-memory implementation. Plan 3 adds SQLite.
  - a transport interface.
- `apps/server`: Fastify, Better Auth, Drizzle and Postgres, implementing the endpoints above.

## Libraries

Chosen after fresh research on 2026-11-11 (licences and versions checked):

- Fastify 5 with @fastify/websocket, @fastify/swagger, @fastify/cors, @fastify/helmet and @fastify/rate-limit.
- [Zod 4](../../design-decisions/zod-schemas.md) with @fastify/type-provider-zod.
- Better Auth 1.7, and its Drizzle adapter.
- Drizzle and drizzle-kit, pinned to 1.0.0-rc.5, with the node-postgres driver (`pg`).
- [Testcontainers](../../design-decisions/testcontainers-postgres.md) with `postgres:18` for tests.
- Our own HLC and seeded random number generator, both a few dozen lines, since no maintained HLC package exists, plus fast-check for property tests.

Lockfile floors for published advisories: fastify 5.12.6, ws 8.21.0, zod 4.6.6, better-auth 1.7.7.

## Testing

- Unit tests in each package.
- API tests against a real Postgres, started with Testcontainers.
- **Acceptance tests** named after the spec scenarios in scope (see the thin-slice design). Plan 2 covers every scenario a headless device can drive, using `Replica`s with in-memory storage against a real server. UI-only scenarios (Not logged in, Session expires in place, Navigate to a linked task) are left to plan 3.
- **The conformance suite:** several simulated devices and a real server, joined by a transport that drops, delays, duplicates and reorders messages from a seeded random number generator. It checks that every device ends up in the same state as a reference run without faults. It covers field-level merges, newest-wins, catch-up after many changes, grant changes while offline, and idempotent retries.

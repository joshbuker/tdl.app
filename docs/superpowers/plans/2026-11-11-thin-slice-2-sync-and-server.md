# Thin slice, plan 2: sync and server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the sync protocol and the server: a headless device engine (`Replica`) in `@tdl/sync`, a Fastify server with Better Auth, Drizzle and Postgres, sharing endpoints, live updates, every headless spec scenario as an acceptance test, a fault-injecting conformance suite, and a Docker Compose stack.

**Architecture:**
- **Devices** change data only by creating field-level operations, stamped with a hybrid logical clock (HLC). They recompute their current state from the operations they hold.
- **The server** authorizes each operation with `@tdl/domain`'s resolver, and validates content with its field validators. It stores every operation, keeps current-state tables for authorization, and fans each accepted operation out to a per-user feed. When visibility changes, it adds earlier history to newly visible feeds, or a `forget`.
- **Devices** pull their feed, and a websocket tells them when it grows.
- **Online-only actions are plain HTTP:** accounts, sessions and invitations.

**Tech Stack:**
- Node 26, Fastify 5, @fastify/websocket, @fastify/swagger, @fastify/cors, @fastify/helmet, @fastify/rate-limit.
- Zod 4.6.6 or later, with @fastify/type-provider-zod.
- Better Auth 1.7 (the email-and-password, username and bearer plugins), with @better-auth/drizzle-adapter.
- drizzle-orm and drizzle-kit at exactly `1.0.0-rc.5`, with `pg`.
- Testcontainers (`postgres:18`) and fast-check.
- Docker Compose.

**Spec:** `docs/superpowers/specs/2026-11-11-sync-protocol-design.md`, within `docs/superpowers/specs/2026-11-10-thin-slice-design.md`. Behavior comes from:
- the feature specs named in each task;
- `docs/design-decisions/`, notably:
  - `current-state-and-history.md`
  - `custom-sync.md`
  - `server-side-sessions.md`
  - `error-contract.md`
  - `strict-validation.md`
  - `container-and-item-grants.md`
  - `visibility-scoped-graph.md`
  - `zod-schemas.md`
  - `testcontainers-postgres.md`

## Global Constraints

- **Plan 1's constraints still hold:**
  - Node 26, run inside `nix-shell`.
  - AGPL-3.0-only, ESM and private packages.
  - `.ts` relative imports.
  - The licence check and `PINS.md`.
  - No recursion over the graph.
  - Error codes and IDs, never English text, from domain and sync code.
  - Acceptance files named `*.acceptance.test.ts`, with `describe('<spec H1>')` and `test('<scenario H3>')` exactly.
- **`@tdl/domain`** keeps `uuid` as its only runtime dependency and does no I/O.
- **`@tdl/sync`** depends only on `@tdl/domain`, `zod` and `uuid`. It does no Node-specific I/O, so it runs in browsers, Capacitor and Electron.
- **No domain rule is written twice.** Access, visibility, audience, field validation and graph rules come from `@tdl/domain`. Server handlers and SQL only load data and call them.
- **The server reads only metadata** to route and authorize: owners, a task's list, link endpoints, grants. Content (`{ field, value }`) is read only by the isolated validation step.
- **HTTP errors follow `error-contract.md`:** 401, 404 (no access looks identical to missing), 403, 422 with per-field errors, and 429. The body shape is `{ code: string, errors?: FieldError[] }`.
- **New pins go in `PINS.md`:** drizzle-orm and drizzle-kit at `1.0.0-rc.5` (lift when 1.0 is stable). Lockfile floors: fastify ≥5.12.6, ws ≥8.21.0, zod ≥4.6.6, better-auth ≥1.7.7.
- **Better Auth settings:**
  - `emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 14, maxPasswordLength: 128 }`
  - plugins `username()` and `bearer()`
  - `session: { expiresIn: 90 days, updateAge: 1 day, cookieCache: { enabled: false } }`
  - telemetry off
- **No breached-password check** in the slice (deferred; see `open-items.md`).

## Review Focus

1. **A batch whose later operations depend on a rejected earlier one.** If `createTask` is rejected for lost access, the task's `title` operation in the same push must get `not-found`, not a 500, and nothing half-applied may remain (Task 7).
2. **Concurrent pushes racing.** Two devices push the same link (A→B) at once: exactly one is accepted and the other gets `duplicate-link` with `existingLinkId`. Sequence numbers never repeat (Task 7).
3. **Losing and regaining access.** Bob is removed (gets `forget`s), then re-invited. His feed redelivers the full history, including removed links between visible tasks, and his `Replica` ends up identical to Alice's view of what he can see (Tasks 8, 9 and 12).
4. **A long catch-up across pages.** With 3,000 feed entries and `limit` 500, pulling in pages delivers each entry once, in order, with `forget`s in their right place relative to the operations around them (Tasks 8 and 12).
5. **Sessions:**
   - A revoked token gets `session-revoked`, even though Better Auth has deleted the session.
   - An expired or logged-out token gets `session-expired`.
   - A websocket upgrade with a bad session or a foreign `Origin` is refused before upgrading (Tasks 6 and 10).

---

### Task 1: Domain additions for sync

**Files:**
- Modify: `packages/domain/src/model.ts` (`Grant` gets `id`), `packages/domain/src/index.ts`, `packages/domain/test/access/resolver.test.ts` and `test/view.test.ts` (grant fixtures gain IDs)
- Create: `packages/domain/src/fields.ts`, `packages/domain/src/account.ts`, `packages/domain/src/access/visibility.ts`
- Create: `packages/domain/test/fields.test.ts`, `test/account.test.ts`, `test/access/visibility.test.ts`

**Interfaces:**
- Consumes: `Task`, `List`, `Link`, `Grant` and `normalizeTitle`, and `AccessData`, `listRole`, `visibleTaskIds` and `taskAccess` (plan 1).
- Produces:
  - `interface Grant { id: Id; userId; target; role }`. `id` is the grant record's ID.
  - `validateField(type: 'list' | 'task' | 'link', field: string, value: unknown): Validated<unknown>`. It returns the normalized value or `FieldError[]`:
    - `list.title` and `task.title`: a string, normalized with `normalizeTitle`, else `required`.
    - `task.notes` and `link.reason`: a string.
    - `task.completedAt`: `null` or an ISO 8601 UTC instant string.
    - `list.editorsCanShare`: a boolean.
    - `link.kind`: `'hard' | 'soft'`.
    - Any other field: `{ field, code: 'unknown-field' }`.
    - A wrong type: `{ field, code: 'invalid' }`.
  - `FieldError.code` widens to `'required' | 'invalid' | 'unknown-field' | 'too-short' | 'too-long' | 'whitespace' | 'uppercase' | 'taken' | 'already-shared' | 'forbidden'`.
  - `validateAccountInput(input: { username: string; email: string; password: string; givenName: string; familyName: string }): Validated<typeof input>`, following `docs/features/account/user-validation.md`:
    - username: required, at most 69 characters (count code points), no whitespace;
    - email: required, a valid format, and `uppercase` if it contains any uppercase letter (never lowercased);
    - password: 14 to 128 characters;
    - given and family names: required, trimmed.
  - `visibleRecords(data: AccessData, links: Iterable<Pick<Link, 'id' | 'prerequisiteId' | 'postrequisiteId'>>, userId: Id): { lists: Set<Id>; tasks: Set<Id>; links: Set<Id>; grants: Set<Id> }`:
    - lists where `listRole` isn't null;
    - `visibleTaskIds`;
    - links with both tasks visible;
    - grants where `userId` is the user, or the grant's target list (or the target task's list) is owned by the user.
  - `audienceOf(data: AccessData, links: Iterable<…same…>, record: { type: 'list' | 'task' | 'link' | 'grant'; id: Id }): Set<Id>`, the users for whom `visibleRecords` contains the record. The candidate users are the owners and grantees mentioned in `data`.

- [ ] **Step 1: Write failing tests.**
  - `fields.test.ts`:
    - `validateField('task','title','  Buy milk ')` gives `{ ok: true, value: 'Buy milk' }`.
    - `validateField('task','title',' ')` gives `required`.
    - `validateField('task','completedAt','2026-11-11T10:00:00Z')` is ok; `'yesterday'` gives `invalid`; `null` is ok.
    - `validateField('link','kind','strong')` gives `invalid`.
    - `validateField('task','colour','x')` gives `unknown-field`.
    - `validateField('list','editorsCanShare','yes')` gives `invalid`.
  - `account.test.ts`, one case per rule:
    - a 70-code-point username gives `too-long`;
    - `'al ice'` gives `whitespace`;
    - `'Alice@example.com'` gives `uppercase`;
    - a 13-character password gives `too-short`, and a 129-character one `too-long`;
    - a blank `givenName` gives `required`;
    - a valid input is ok, with the names trimmed;
    - an emoji username is ok.
  - `visibility.test.ts`. Alice owns House (Paint fence, Fix roof); bob has an editor grant `g1` on House; carol has a task grant `g2` on Paint fence; Paint fence→Fix roof is link `l1`.
    - For carol, `visibleRecords` gives `tasks {Paint fence}`, `links {}`, `lists {}`, `grants {g2}`.
    - For alice it gives everything, including both grants.
    - `audienceOf(…, {type:'task', id:'Fix roof'})` is `{alice, bob}`.
    - `audienceOf(…, {type:'link', id:'l1'})` is `{alice, bob}`.
    - `audienceOf(…, {type:'grant', id:'g2'})` is `{alice, carol}`.
- [ ] **Step 2: Run** `pnpm vitest run packages/domain`. Expected: the new files FAIL; the existing tests fail to typecheck only where grants lack `id`.
- [ ] **Step 3: Implement.** Add `id` to every grant fixture in the existing tests. Export the new modules from `index.ts`.
- [ ] **Step 4: Run** `pnpm vitest run packages/domain && pnpm typecheck && pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add field, account and visibility rules to the domain".

### Task 2: The sync package: HLC and operations

**Files:**
- Create: `packages/sync/package.json` (`@tdl/sync`; dependencies `@tdl/domain` `workspace:*`, `zod`, `uuid`), `packages/sync/tsconfig.json` (`types: []`, like domain), and a reference in the root `tsconfig.json`
- Create: `packages/sync/src/hlc.ts`, `src/operations.ts`, `src/random.ts`, `src/index.ts`
- Create: `packages/sync/test/hlc.test.ts`, `test/operations.test.ts`, `test/random.test.ts`

**Interfaces:**
- Produces, in `hlc.ts`:
  - `createClock(nodeId: string, now: () => number): Clock`, where `Clock = { tick(): string; receive(remote: string): void }`.
  - The format is `` `${ms.padStart(15,'0')}:${counter.padStart(6,'0')}:${nodeId}` ``. String order is causal order, with ties broken by node ID.
  - `tick` returns a value strictly greater than every earlier `tick` or `receive`d value. When the wall clock goes backwards or stands still, the counter increments.
  - `compareHlc(a, b): -1 | 0 | 1`.
- Produces, in `operations.ts` (Zod schemas plus inferred types):
  - `RecordRef = { type: 'list' | 'task' | 'link' | 'grant'; id: Id }`
  - `MetaChange`, discriminated on `kind`:
    - `createList`
    - `createTask { listId }`
    - `moveTask { listId }`
    - `createLink { prerequisiteId, postrequisiteId }`
    - `removeLink`
    - `grant { userId, target: { kind: 'list' | 'task'; id }, role: 'editor' | 'commenter' | 'viewer' }`
    - `revokeGrant`
  - `ContentChange = { field: string; value: JsonValue }`
  - `Operation = { id; hlc; record: RecordRef; meta: MetaChange | null; content: ContentChange | null }`, refined so that exactly one of `meta` and `content` is non-null, and `id` and record IDs are UUIDs.
  - `PushResult`:
    - `{ id, status: 'accepted', seq: number }`
    - `{ id, status: 'rejected', code: 'not-found' | 'forbidden' | 'invalid' | 'duplicate-link', errors?: FieldError[], existingLinkId?: Id }`
  - `FeedEntry`:
    - `{ id: number, kind: 'op', op: Operation & { seq: number; authorId: Id } }`
    - `{ id: number, kind: 'forget', record: RecordRef }`
  - `PullPage = { entries: FeedEntry[]; cursor: number; more: boolean }`
  - Schemas are exported as `operationSchema`, `pushRequestSchema` (`{ ops: Operation[] }`, at most 500), `pushResponseSchema`, `pullPageSchema`, `feedNotificationSchema` (`{ type: 'feed', id: number }`) and `errorBodySchema`.
- Produces, in `random.ts`: `seededRandom(seed: number): () => number` (mulberry32), for test harnesses.

- [ ] **Step 1: Write failing tests.**
  - `hlc.test.ts`:
    - 1,000 `tick`s with a frozen clock are strictly increasing.
    - After `receive` of a value 10 s ahead, the next `tick` is greater than it.
    - With a clock that goes backwards, `tick` still increases.
    - At the same instant, the node ID breaks ties.
    - A fast-check property: for any interleaving of `tick` and `receive`, the outputs are strictly increasing.
  - `operations.test.ts`:
    - a valid `createTask` operation parses;
    - an operation with both `meta` and `content`, or neither, fails;
    - a non-UUID record ID fails;
    - a push of 501 operations fails.
  - `random.test.ts`: the same seed gives the same first 5 numbers; all values are in [0, 1).
- [ ] **Step 2: Run** `pnpm vitest run packages/sync`. Expected: FAIL.
- [ ] **Step 3: Implement** the three modules and `index.ts`.
- [ ] **Step 4: Run** `pnpm vitest run packages/sync && pnpm typecheck && pnpm lint && pnpm check:licences`. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add the sync package with HLC and the operation format".

### Task 3: Device state from operations

**Files:**
- Create: `packages/sync/src/state.ts`, `test/state.test.ts`, and `test/ops.ts` (test helpers that build operations)

**Interfaces:**
- Consumes: `Operation`, `compareHlc`, and the domain `Task`, `List`, `Link`, `Grant` and `AccessData`.
- Produces:
  - `interface DeviceState { lists: Map<Id, List & { createdAt: string }>; tasks: Map<Id, Task & { createdAt: string }>; links: Map<Id, Link & { createdAt: string }>; grants: Map<Id, Grant> }`
  - `materialize(ops: Iterable<Operation & { authorId: Id }>): DeviceState`. It is pure. It applies metadata in HLC order, takes each content field from its highest-HLC operation, and drops records with `removeLink` or `revokeGrant`.
    - A record's `createdAt` is the wall-clock part of its create operation's HLC, as an ISO instant.
    - A list's `ownerId` is its `createList` author.
    - Content for a record with no create operation is ignored. Defaults:
      - task `title ''`, `notes ''`, `completedAt null`;
      - list `title ''`, `editorsCanShare false`;
      - link `kind 'hard'`, `reason ''`.
  - `accessData(state: DeviceState): AccessData`.
  - `historyOf(ops: Iterable<Operation & { authorId: Id }>, taskId: Id): HistoryEntry[]`, where `HistoryEntry = { opId; hlc; authorId; change: MetaChange | ContentChange; recordType: 'task' | 'link'; recordId }`. It covers the task's operations and those of every link whose `createLink` names it, sorted by HLC.

- [ ] **Step 1: Write failing tests** in `state.test.ts`, using builders from `test/ops.ts`:
  - Create then title gives a task titled correctly.
  - Two titles with HLCs `t2 > t1`, applied in either order, give the `t2` title (newest wins regardless of arrival).
  - Edits to `title` and `notes` from different devices are both kept.
  - `removeLink` deletes the link from state; `historyOf` both tasks still lists the `createLink` and `removeLink` entries.
  - `revokeGrant` drops the grant.
  - `moveTask` changes `listId`.
  - A content operation for an unknown record is ignored.
  - The list owner is the author of `createList`.
  - Conflicting renames "Paint the fence" (t1) and "Stain fence" (t2) leave the title "Stain fence", and `historyOf` contains both renames in HLC order.
- [ ] **Step 2: Run** `pnpm vitest run packages/sync/test/state.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `state.ts`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Compute device state and history from operations".

### Task 4: The Replica engine

**Files:**
- Create: `packages/sync/src/store.ts` (the `ReplicaStore` interface plus `MemoryStore`), `src/transport.ts` (the interface and errors), `src/replica.ts`
- Create: `packages/sync/test/replica.test.ts` and `test/fake-transport.ts` (an in-memory server stand-in that only assigns sequence numbers and echoes operations to feeds; no access rules)

**Interfaces:**
- Consumes:
  - `materialize`, `accessData`, `historyOf`, `createClock`, `Operation`, `PushResult` and `PullPage`;
  - from `@tdl/domain`: `validateField`, `validateTaskInput`, `validateListInput`, `checkNewLink`, `buildGraph`, `can`, `listRole` and `newId`.
- Produces:
  - `ReplicaStore`, where every method is async:
    - `load(): StoredReplica | null`, with `StoredReplica = { userId; deviceId; cursor: number; confirmed: FeedOp[]; pending: Operation[]; rejected: RejectedOp[] }`;
    - `appendConfirmed(ops: FeedOp[], cursor: number)`
    - `forget(record: RecordRef, cursor: number)`
    - `putPending(op)`
    - `removePending(id)`
    - `putRejected(r: RejectedOp)`
    - `removeRejected(id)`
    - `wipe()`
  - `RejectedOp = { op: Operation; code; errors?; at: string }`. `MemoryStore` implements `ReplicaStore`.
  - `Transport`:
    - `push(ops: Operation[]): Promise<PushResult[]>`
    - `pull(after: number, limit: number): Promise<PullPage>`
    - `subscribe(onFeed: (id: number) => void): () => void`
  - Transport errors are `SessionError { code: 'session-revoked' | 'session-expired' }` and `NetworkError`.
  - `Replica.open({ store, transport, userId, deviceId, now?, newId? }): Promise<Replica>`.
  - Local edits are applied at once to pending operations, and return results. User-facing failures are values, never throws:
    - `createList(title)` returns `Validated<Id>`.
    - `createTask(listId, title, notes?)` returns `Validated<Id>`, or `{ ok: false, errors: [{ field: 'listId', code: 'forbidden' }] }` when the user can't `addTask` there.
    - `setTaskField(taskId, field: 'title' | 'notes' | 'completedAt', value)` returns `Validated<void>`.
    - `moveTask(taskId, listId)` returns `Validated<void>`.
    - `addLink(pre, post, kind = 'hard', reason = '')` returns `{ ok: true; id } | { ok: false; rejection: LinkRejection }`, using `checkNewLink` on `buildGraph(state)` with `canEdit = id => can(access, userId, 'edit', id)`.
    - `removeLink(id)` and `setLinkField(id, 'kind' | 'reason', value)`.
    - `discardRejected(id)`.
  - Reads:
    - `state(): DeviceState`, computed from confirmed and pending operations;
    - `history(taskId)`;
    - `pending()` and `rejected()`;
    - `status(): 'ok' | 'offline' | 'logged-out' | 'revoked'`.
  - `sync(): Promise<void>`:
    1. Push the pending operations in order, in batches of up to 500.
    2. On each result: `accepted` removes it from pending. `rejected` moves it to rejected.
    3. `duplicate-link` folds the link: re-issue pending `kind`/`reason` content for the existing link ID with the **original HLCs** and new operation IDs, and drop the local link's operations.
    4. Pull until `more` is false, appending operations and applying `forget` (drop the record and its operations from confirmed, and any link operations touching a forgotten task).
    5. Feed every received HLC to `clock.receive`.

    `NetworkError` sets `offline` and keeps everything. `session-revoked` calls `store.wipe()` and sets `revoked`. `session-expired` sets `logged-out` and keeps everything.
  - `startLive(): () => void` subscribes and calls `sync()` on each notification, coalescing overlapping calls.

- [ ] **Step 1: Write failing tests** in `replica.test.ts`, with `MemoryStore` and the fake transport:
  - **Edits while offline:**
    - A replica with a transport that throws `NetworkError` creates "Buy milk" and links Buy paint→Paint fence. `state()` shows them, `pending()` has 5 operations, and `status()` is `offline`.
    - After switching to a working transport, `sync()` empties `pending()`.
  - **Validation:**
    - `createTask(inbox, '   ')` gives `required`, and nothing is pending.
    - `'  Buy milk  '` stores `Buy milk`.
  - **Rejection:**
    - The transport rejects a title edit as `not-found`. It moves to `rejected()` with code `not-found`, and `state()` shows the previous title.
    - `discardRejected` removes it.
  - **Duplicate link:**
    - The transport answers `duplicate-link` with `existingLinkId: 'L0'`, after this replica set `reason 'Need color'` on its own link.
    - After `sync()`, the local link is gone, a pending or accepted `reason` operation targets `L0` with the original HLC, and `state().links.get('L0').reason` is `'Need color'` when its HLC is the newest.
  - **Forget:** after a pulled `forget` of task T, `state()` has neither T nor links touching it, and `history(T)` is empty.
  - **Sessions:**
    - `session-revoked` leaves `status()` `revoked`, the store wiped, and `state()` empty, including pending operations.
    - `session-expired` leaves `status()` `logged-out`, with pending operations kept.
  - **Idempotent replay:** pulling the same page twice (a transport that repeats the page) doesn't duplicate history entries.
  - **Clock:** after pulling an operation whose HLC is in the future, the next local operation's HLC is greater.
- [ ] **Step 2: Run** `pnpm vitest run packages/sync`. Expected: FAIL.
- [ ] **Step 3: Implement** `store.ts`, `transport.ts` and `replica.ts`. State is recomputed with `materialize` after each change. Optimizing that is out of scope.
- [ ] **Step 4: Run** `pnpm vitest run packages/sync && pnpm typecheck && pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add the Replica sync engine with an outbox and rejected changes".

### Task 5: Server skeleton, schema and test database

**Files:**
- Create: `apps/server/package.json` (`@tdl/server`), `apps/server/tsconfig.json`, `apps/server/src/config.ts`, `src/app.ts`, `src/main.ts`, `src/errors.ts`
- Create: `apps/server/src/db/schema.ts`, `src/db/client.ts`, `apps/server/drizzle.config.ts`, and `apps/server/drizzle/` (generated migrations, committed)
- Create: `apps/server/test/global-setup.ts`, `test/db.ts`, `test/app.test.ts`, `test/openapi.test.ts`, `test/__snapshots__/`
- Modify: root `vitest.config.ts` (add `apps/*`), root `tsconfig.json` references, `PINS.md`, `.github/workflows/ci.yml` (nothing to add: Testcontainers uses the runner's Docker)

**Interfaces:**
- Produces:
  - `loadConfig(env: NodeJS.ProcessEnv): Config`, Zod-parsed: `{ databaseUrl; port (default 3000); origin (the public URL, e.g. https://tdl.app); authSecret (≥32 chars); trustProxy: boolean (default false) }`. Invalid configuration throws at startup, naming the variables.
  - `buildApp(config, deps: { db: Db; now?: () => number }): Promise<FastifyInstance>`, with the Zod type provider, helmet, CORS (`origin: config.origin`, `credentials: true`), rate-limit and swagger registered, and `GET /health` returning `{ ok: true }`. `main.ts` runs migrations, then listens, with graceful shutdown on SIGTERM.
  - `sendError(reply, status, code, errors?)` produces the error-contract body.
  - Drizzle schema (snake_case columns; UUIDs as `uuid`; times as `timestamptz`). Better Auth's tables come from its CLI generator for the Drizzle adapter (with the username and bearer plugins and the additional fields below), and are committed into `schema.ts`:
    - Better Auth's `user` (with additional fields `username`, `display_username`, `given_name`, `family_name`, `terms_accepted_at`, `default_list_id`), `session` (with additional field `last_synced_at`), `account` and `verification`.
    - `revoked_sessions(token_hash text pk, user_id, revoked_at)`
    - `lists(id pk, owner_id, editors_can_share boolean default false)`
    - `tasks(id pk, list_id)`
    - `links(id pk, prerequisite_id, postrequisite_id, unique(prerequisite_id, postrequisite_id))`
    - `grants(id pk, user_id, target_kind, target_id, role)`
    - `invitations(id pk, inviter_id, invitee_id, target_kind, target_id, role, created_at)`
    - `operations(seq bigserial pk, id uuid unique, hlc text, record_type text, record_id uuid, meta jsonb null, content jsonb null, author_id, session_id null, received_at)`, indexed on `(record_type, record_id)`
    - `feed(id bigserial pk, user_id, kind text, op_seq bigint null, record_type text, record_id uuid)`, indexed on `(user_id, id)`
  - Test helpers:
    - `test/global-setup.ts` starts one `postgres:18` Testcontainer per run and exposes its URL through `provide`.
    - `testDb()` creates a fresh database per test file, runs the migrations, and returns `{ db, url, close }`.
    - `testApp(overrides?)` returns `buildApp` on a test database with fixed configuration.

- [ ] **Step 1: Write failing tests.**
  - `app.test.ts`:
    - `GET /health` gives 200 `{ ok: true }`.
    - `loadConfig({})` throws an error naming `DATABASE_URL` and `AUTH_SECRET`.
    - An unknown route gives 404 with body `{ code: 'not-found' }`.
  - `openapi.test.ts`: `app.swagger()` matches a stored snapshot. Review the snapshot by hand once; it guards the Zod adapter's known gaps.
- [ ] **Step 2: Run** `pnpm vitest run apps/server`. Expected: FAIL.
- [ ] **Step 3: Implement**, then generate the first migration with `pnpm --filter @tdl/server drizzle-kit generate`. Add the drizzle pins to `PINS.md`.
- [ ] **Step 4: Run** `pnpm vitest run apps/server && pnpm typecheck && pnpm lint && pnpm check:licences`. Expected: PASS, with the container started once.
- [ ] **Step 5: Commit** with the message "Add the server skeleton, schema and a Postgres test container".

### Task 6: Accounts and sessions

**Files:**
- Create: `apps/server/src/auth.ts` (the Better Auth instance and the catch-all `/api/auth/*` bridge), `src/session-guard.ts`, `src/routes/me.ts`, `src/routes/sessions.ts`, `src/server-ops.ts` (writing server-made operations)
- Create: `apps/server/test/auth.test.ts`, `test/sessions.test.ts`

**Interfaces:**
- Consumes: `validateAccountInput` (Task 1), `createClock` and `Operation` (Task 2), and the schema (Task 5).
- Produces:
  - **Sign-up:** `POST /api/auth/sign-up/email` with `{ email, password, name, username, givenName, familyName, acceptTerms: true }`.
    - A `hooks.before` on that path runs `validateAccountInput`, and answers 422 with `{ code: 'invalid', errors }`.
    - `acceptTerms` other than `true` gives 422 `{ field: 'acceptTerms', code: 'required' }`.
    - Uniqueness ignores case for username and email. A clash gives 422 `{ field, code: 'taken' }`.
    - `terms_accepted_at` is set.
    - `databaseHooks.user.create.after` calls `writeServerOps(tx, actorId, ops)` to create the Inbox: `createList` plus `title 'Inbox'`, authored by the new user. It then sets `default_list_id`.
  - **Login:** `POST /api/auth/sign-in/username`, and `/sign-in/email`. Wrong credentials give 401 with one generic code, `invalid-credentials`, whichever field was wrong.
  - **Sessions:** login responses include the bearer token (bearer plugin header `set-auth-token`), and set the httpOnly session cookie.
  - `requireSession(req, reply): Promise<{ userId; sessionId; tokenHash }>` is a preHandler. It reads the cookie or `Authorization: Bearer`, and calls `auth.api.getSession`.
    - With no valid session, it answers 401 `session-revoked` if `sha256(token)` is in `revoked_sessions`, otherwise 401 `session-expired`. A missing token is 401 `session-expired`.
    - `token` is the raw session token: the bearer value, or the cookie value's part before its first `.` (the cookie is signed as `token.signature`). The tombstone is written with the same hash.
  - `GET /me` returns `{ userId, username, defaultListId }`.
  - `GET /sessions` returns `[{ id, userAgent, createdAt, lastSyncedAt, current: boolean }]` for the caller.
  - `DELETE /sessions/:id`, for the caller's own session only (anything else is 404), inserts a `revoked_sessions` tombstone, then calls Better Auth's `revokeSession`. Gives 204.
  - `POST /api/auth/sign-out` ends the current session without a tombstone.
  - `writeServerOps(tx, actorId, ops: Omit<Operation,'hlc'>[]): Promise<number[]>` stamps each operation with the server clock (node ID `server`), stores it, updates current state, and fans it out (it shares the store-and-fan-out function with Task 7, so write that function here, in `src/sync/apply.ts`).

- [ ] **Step 1: Write failing tests.**
  - `auth.test.ts`:
    - Signing up as alice gives 200 plus a token. `GET /me` gives her username and a `defaultListId`. Pulling her feed (raw SQL is fine here) has the Inbox's `createList` and its `title` operations.
    - A sign-up with `Alice@Example.com` gives 422 `uppercase`.
    - A 13-character password gives 422 `too-short`.
    - Username `ALICE` after `alice` exists gives 422 `taken`.
    - Logging in with the username, and with the email, both give a token.
    - The wrong password and an unknown user give 401 `invalid-credentials` with identical bodies.
  - `sessions.test.ts`:
    - Alice logs in twice (phone and laptop). `GET /sessions` lists two, one `current`.
    - The laptop revokes the phone. The phone's `GET /me` gives 401 `session-revoked`, and the laptop's still works.
    - After sign-out, the old token gives 401 `session-expired`.
    - With a session whose `expires_at` is set in the past by SQL, the token gives 401 `session-expired`.
    - `DELETE /sessions/<bob's session>` by alice gives 404.
    - A request with no token gives 401 `session-expired`.
- [ ] **Step 2: Run** `pnpm vitest run apps/server/test/auth.test.ts apps/server/test/sessions.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Use the Better Auth Fastify bridge from its documentation (`fromNodeHeaders`; copy status, headers and body back).
- [ ] **Step 4: Run** the same command, then `pnpm typecheck && pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add sign-up, login, the Inbox and revocable sessions".

### Task 7: Push

**Files:**
- Create: `apps/server/src/routes/sync-push.ts`, `src/sync/authorize.ts`, `src/sync/access-loader.ts`
- Modify: `apps/server/src/sync/apply.ts`
- Create: `apps/server/test/push.test.ts`

**Interfaces:**
- Consumes: `pushRequestSchema` and `PushResult` (Task 2), `requireSession` and `apply.ts` (Task 6), and from the domain: `can`, `listRole`, `canMoveTask`, `roleAllows`, `audienceOf` and `validateField`.
- Produces:
  - `POST /sync/push` takes `{ ops }` and returns `{ results: PushResult[] }`, in the same order. Each operation gets its own transaction, in order:
    1. If `id` is already in `operations` with the same author, return `accepted` with its original `seq`. If a different author already used that ID, return `forbidden`.
    2. `loadAccess(tx, op): AccessData` loads the lists, tasks and grants involved. The server uses its own current state, never the operation's claims.
    3. `authorize(access, userId, op)` returns `'ok' | 'not-found' | 'forbidden'`:
       - `createList`: ok, unless the ID exists (then `forbidden`).
       - `createTask`: the list must exist and be visible, else `not-found`. It needs `addTask` (a list role of owner, or editor via the list), else `forbidden`. If the task ID already exists, `forbidden`.
       - `moveTask`: `canMoveTask`. If the task isn't visible, `not-found`.
       - Task content: `edit`.
       - List content: `listRole` editor or above, except `editorsCanShare`, which needs `manageAccess` (the owner).
       - `createLink`: both tasks visible (else `not-found`) and editable (else `forbidden`).
       - `removeLink` and link content: the link exists (else `not-found`), and both its tasks are editable.
       - `grant` and `revokeGrant` from a device: always `forbidden`, since only the server makes those.
    4. Content passes `validateField`, else `invalid` with errors.
    5. Insert into `operations`, and update current state: `createList` inserts into lists, `createTask` into tasks, `moveTask` updates `tasks.list_id`, `createLink` inserts into links (a unique violation gives `duplicate-link` with `existingLinkId`), `removeLink` deletes the row, and `editorsCanShare` content updates `lists.editors_can_share`.
    6. Fan out: insert a `feed` row for each user in `audienceOf` the record. `moveTask` defers to Task 8's visibility change.

    The batch reply lists every result. One rejected operation never aborts the others.

- [ ] **Step 1: Write failing tests** in `push.test.ts`, with alice and bob signed up through the API:
  - Alice pushes `createTask` plus `title` into her Inbox: both `accepted`, increasing `seq`, and both in alice's feed only.
  - Pushing the same batch again gives the same results and adds no `operations` or `feed` rows.
  - Bob's `createTask` into alice's Inbox gives `not-found`, and his `title` for that task in the same batch also gives `not-found` (Review Focus 1). No rows are written.
  - A `title` of `'  '` gives `invalid` with `required`.
  - With bob granted viewer on House (insert the grant by SQL here), bob's `completedAt` on Paint fence gives `forbidden`. As an editor, it's `accepted`, and the feed row goes to both alice and bob.
  - **Duplicate race (Review Focus 2):** two concurrent `createLink` A→B pushes from alice's two sessions, with different link IDs: one `accepted`, the other `duplicate-link` with the accepted one's ID. B→A is `accepted` (a loop, kept).
  - `removeLink` deletes the `links` row. A later `reason` for that link gives `not-found`.
  - A device-sent `grant` gives `forbidden`.
  - Reusing another user's operation ID gives `forbidden`.
- [ ] **Step 2: Run** `pnpm vitest run apps/server/test/push.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command, then `pnpm typecheck && pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Accept, authorize and fan out pushed operations".

### Task 8: Pull and visibility changes

**Files:**
- Create: `apps/server/src/routes/sync-pull.ts`, `src/sync/visibility.ts`
- Modify: `apps/server/src/sync/apply.ts` (handle visibility-changing operations)
- Create: `apps/server/test/pull.test.ts`

**Interfaces:**
- Consumes: `visibleRecords` (Task 1), `PullPage` (Task 2), and `apply.ts` (Tasks 6 and 7).
- Produces:
  - `GET /sync/pull?after=<int ≥0>&limit=<1..1000, default 500>` returns a `PullPage` of the caller's feed rows with `id > after`, ordered by `id`, joined to `operations` for `op` rows. It also sets `session.last_synced_at = now`.
  - `applyVisibilityChange(tx, op, before: AccessData, after: AccessData, affectedUsers: Id[])`. For each affected user, it compares `visibleRecords` before and after, over the records in scope: the target list's or task's tasks, the links touching them, and the grants involved.
    - **Newly visible records:** append feed rows for all their earlier operations, in `seq` order. That includes the operations of removed links whose two tasks are now both visible, found through `createLink` metadata in `operations`.
    - **No longer visible:** append `forget` rows, links before tasks and tasks before lists.
    - Then the operation itself fans out to the after-audience.
  - Visibility-changing operations are `moveTask` (affected: the before and after audiences of the task), and `grant` and `revokeGrant` (affected: the grantee).

- [ ] **Step 1: Write failing tests** in `pull.test.ts`:
  - **Paging:** alice creates 1,200 operations. Pulling with `limit 500` from 0 takes three pages (`more` true, true, false), and the IDs are strictly increasing with no gaps or repeats.
  - **Revocation:** alice owns House (two tasks, a link between them, then a second link that was removed). Granting bob a viewer grant through `writeServerOps(grant)` puts into bob's feed every House operation, including the removed link's `createLink` and `removeLink`, in `seq` order. A `revokeGrant` then appends `forget` rows for both links, both tasks and the list, in that order (Review Focus 3).
  - **Re-grant:** granting bob again redelivers the full history.
  - **Moving:** alice moves Paint fence from shared House to her private Garden. Bob gets a `forget` for Paint fence and for its links. Moving it back redelivers its history to bob.
  - **Task grant:** a task grant to carol on Paint fence delivers only Paint fence's operations, plus links to tasks she can also see (none here).
  - **Last synced:** after a pull, `GET /sessions` shows this session's `lastSyncedAt`.
  - **Invalid cursor:** `after=-1` gives 422.
- [ ] **Step 2: Run** `pnpm vitest run apps/server/test/pull.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command, then all server tests. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Serve each user's feed and handle visibility changes".

### Task 9: Sharing endpoints

**Files:**
- Create: `apps/server/src/routes/invitations.ts`, `src/routes/grants.ts`, `test/sharing.test.ts`

**Interfaces:**
- Consumes: `writeServerOps` and `applyVisibilityChange` (Tasks 6 and 8), and `roleAllows`, `listRole` and `taskAccess`.
- Produces:
  - `POST /invitations { target: { kind, id }, username, role }`:
    - The caller needs `manageAccess` on a list target (the owner).
    - For a task target, the caller needs to be its list owner, or an editor via the list when `editorsCanShare` is set.
    - If the target isn't visible, 404. If the caller lacks the role, 403.
    - An unknown username, inviting yourself, or a role of `owner` gives 422.
    - Re-inviting someone who already has an equal or higher grant gives 422 `{ field: 'username', code: 'already-shared' }`.
    - Returns 201 `{ id }`.
  - `GET /invitations` returns the caller's received invitations: `[{ id, inviter: { username }, target, role, title?: never }]`. Titles stay on devices; the target ID is enough for the slice.
  - `POST /invitations/:id/accept` writes a `grant` server operation (new grant ID, authored by the invitee), runs `applyVisibilityChange`, deletes the invitation, and returns 204.
  - `POST /invitations/:id/decline` deletes it and returns 204. Someone else's invitation gives 404.
  - `DELETE /grants/:id` is allowed for the grantee (leaving) or the target's owner (removing a collaborator). It writes `revokeGrant`, runs `applyVisibilityChange`, and returns 204. Anyone else gets 404.

- [ ] **Step 1: Write failing tests** in `sharing.test.ts`:
  - **Invite and accept:**
    - Alice invites bob to House as an editor. `GET /invitations` for bob lists it.
    - After he accepts, bob's next pull contains the House list and its tasks, and alice's pull contains the `grant` operation.
    - Bob's `title` push on a House task is `accepted`.
  - **Viewer:** as a viewer, bob's `completedAt` push is `forbidden`.
  - **Single task:** alice shares Paint fence with carol as an editor. Carol's feed has Paint fence but not House or Fix roof, and her edit to Paint fence is `accepted`.
  - **Removing a collaborator:**
    - Alice deletes bob's grant. Bob's next pull has `forget`s for House and its tasks.
    - His later `title` push on Paint fence is `not-found` (the "Remove a collaborator" rule: edits afterwards are refused).
  - **Leaving:** bob deletes his own grant, with the same effect, and alice's feed has the `revokeGrant`.
  - **Editors sharing tasks:** bob, an editor, inviting carol to Paint fence gets 403, until alice pushes `editorsCanShare: true` for House; then 201.
  - **Bad invitations:** inviting `nosuchuser`, or yourself, gives 422. A third user calling `DELETE /grants/<bob's grant>` gets 404.
- [ ] **Step 2: Run** `pnpm vitest run apps/server/test/sharing.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** The server reads `editorsCanShare` from `lists.editors_can_share`, which Task 7's push updates when that operation is accepted (it is metadata, see the sync design's record table).
- [ ] **Step 4: Run** the server tests. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add invitations, leaving and removing collaborators".

### Task 10: Live updates and the HTTP transport

**Files:**
- Create: `apps/server/src/sync/notifier.ts`, `src/routes/sync-ws.ts`, `test/ws.test.ts`
- Create: `packages/sync/src/http-transport.ts`, `packages/sync/test/http-transport.test.ts` (against a tiny fetch stub), and an export from `src/index.ts`

**Interfaces:**
- Produces:
  - `Notifier`, which is in-process: `notify(userId, feedId)` and `subscribe(userId, fn) → unsubscribe`. `apply.ts` calls `notify` after each transaction commits, with each affected user's highest feed ID.
  - `GET /sync/ws`:
    - In `preValidation`, it requires a session (Task 6's guard; a failure answers 401 before the upgrade), and an `Origin` equal to `config.origin` or absent (native apps). A foreign `Origin` gives 403.
    - `maxPayload` is 1,024 bytes. On connect, the server sends `{ type: 'feed', id: <latest feed id> }`, then one message per notification. Incoming messages are ignored.
    - When the session is revoked, the socket is closed with code 4401.
  - `createHttpTransport({ baseUrl, token?: string, fetch?: typeof fetch, WebSocket?: typeof WebSocket }): Transport`:
    - It sends `Authorization: Bearer` when a token is given, otherwise uses cookies (`credentials: 'include'`).
    - It maps 401 bodies to `SessionError` and fetch failures to `NetworkError`.
    - `subscribe` opens `/sync/ws`, reconnects with a capped backoff of 1 s to 30 s, and maps a 4401 close to `SessionError('session-revoked')` on the next pull.

- [ ] **Step 1: Write failing tests.**
  - `ws.test.ts`, with the server listening on port 0:
    - Alice's socket receives a `feed` message within 1 s of bob pushing an edit to a shared task.
    - A socket with no token is refused with 401.
    - `Origin: https://evil.example` gives 403.
    - Revoking the session closes an open socket with code 4401.
  - `http-transport.test.ts`:
    - a 401 `session-revoked` body throws `SessionError` with that code;
    - a rejected fetch throws `NetworkError`;
    - push and pull bodies are parsed with the schemas, and a malformed body throws.
- [ ] **Step 2: Run** `pnpm vitest run apps/server/test/ws.test.ts packages/sync/test/http-transport.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Push live feed notifications over a websocket".

### Task 11: Acceptance tests

**Files:**
- Create: `apps/server/test/acceptance/harness.ts`:
  - `startServer()` returns `{ url, close }`.
  - `signUp(name)` returns `{ userId, token, defaultListId }`.
  - `device(user, opts?)` returns a `Replica` with `MemoryStore` and `createHttpTransport`.
  - `share(owner, target, invitee, role)` invites and accepts.
  - `settle(...replicas)` syncs every replica until none has anything pending and pulls return nothing new.
  - `nextUp(replica)` returns `nextUpTaskIds(buildGraph(...))` over its state, as titles.
- Create one file per spec in `apps/server/test/acceptance/`: `sign-up`, `login`, `create-task`, `edit-task`, `complete-task`, `lists`, `link-tasks`, `next-up`, `offline` and `sharing`, each `.acceptance.test.ts`
- Modify: `scenario-scope.json`

**Interfaces:**
- Consumes: everything above. Tests go through the API, a `Replica` and the domain only, never SQL.
- Scope: `scenario-scope.json` lists exactly these spec paths and scenario titles:
  - `account/sign-up.md`: Sign up
  - `account/login.md`: Log in; Log in with email; Wrong password; Revoke a lost device; Log out
  - `tasks/create-task.md`: Create a task with a title; Title is required; Surrounding whitespace is stripped; Duplicate titles are allowed
  - `tasks/edit-task.md`: Rename a task; Edit notes
  - `tasks/complete-task.md`: Complete a task; Mark a task incomplete again
  - `organization/lists.md`: Create a list
  - `dependencies/link-tasks.md`: Add a prerequisite; Reject a cycle; Reject a redundant link; Cycles through completed tasks are still rejected; Completed tasks don't make links redundant; Remove a link; Existing link that becomes redundant is kept; Can't link a task to itself; Link already exists; Both tasks must be editable
  - `dependencies/next-up.md`: Unblocked task is next up; Blocked task is not next up; Completing a prerequisite unblocks; Marking a prerequisite incomplete blocks again
  - `app/offline.md`: Create offline; Link offline; Conflicting edits keep the most recent; Links that together form a cycle; Live updates; Rejected offline changes are kept
  - `app/sharing.md`: Share a list; Share a single task; Viewer can't edit; Leave a shared list; Hidden blocker; Loop only another user can see; Remove a collaborator

  "Not logged in", "Session expires in place" and "Navigate to a linked task" are UI scenarios, left to plan 3.

- [ ] **Step 1: Write the acceptance tests**, one `test` per scenario above, translating each Given/When/Then literally. For example:
  - **"Log in"** checks that her Inbox task appears on a fresh device after login and sync.
  - **"Revoke a lost device"**:
    - The laptop revokes the phone, and the phone's next `sync()` sets `revoked` with an empty state, even though it had pending operations.
    - The laptop's replica still syncs.
  - **"Conflicting edits keep the most recent"**:
    - Two replicas are offline. The phone renames to "Paint the fence" at t1, and the laptop to "Stain fence" at t2, with an injected `now`.
    - After `settle`, both show "Stain fence", and `history()` has both renames.
  - **"Links that together form a cycle"**:
    - The phone adds A→B and the laptop B→A, both offline. After `settle`, both links exist on both devices.
    - `findLoops(buildGraph(state))` gives one loop naming both links.
  - **"Live updates"**: with `startLive()`, alice's replica shows bob's completion within 2 s, without calling `sync()`.
  - **"Rejected offline changes are kept"**: bob edits offline, alice removes him, and bob syncs. `rejected()` has his edit with code `not-found`, and the task is gone from his state.
  - **"Hidden blocker" and "Loop only another user can see"**: run as in plan 1's `view.test.ts`, but across two users' replicas through the server.
- [ ] **Step 2: Run** `pnpm test && pnpm check:scenarios`. Expected:
  - Tests for behavior not yet wired (if any) FAIL, and are fixed in the owning module, not in the test.
  - Once everything passes, `check:scenarios` prints nothing and exits 0.
  - Removing one test makes it report `missing`.
- [ ] **Step 3: Fix any gaps** the acceptance tests reveal, each fixed by a unit test in the owning package first.
- [ ] **Step 4: Run** `pnpm lint && pnpm typecheck && pnpm test && pnpm check:scenarios && pnpm check:licences`. Expected: all pass.
- [ ] **Step 5: Commit** with the message "Add acceptance tests for the slice's headless scenarios".

### Task 12: Sync conformance suite

**Files:**
- Create: `apps/server/test/conformance/faulty-transport.ts`, `script.ts` and `conformance.test.ts`

**Interfaces:**
- Consumes: `seededRandom`, `Replica`, `createHttpTransport` and the Task 11 harness.
- Produces:
  - `faulty(inner: Transport, rand, opts: { drop: number; dropReply: number; duplicate: number; delayMs: [number, number] }): Transport`. Each call:
    - may throw `NetworkError` before sending (`drop`);
    - may send and then throw `NetworkError`, losing the reply (`dropReply`);
    - may send twice (`duplicate`);
    - waits a random delay first, so concurrent devices interleave and reorder.
  - `runScript(seed, { users: 2, devicesPerUser: 2, steps: 200 })`:
    - It performs random steps on random devices: create, rename, notes, complete or uncomplete, link or unlink, share or unshare between the two users, go offline or online, and sync.
    - Each step goes through the faulty transports, using fixed `now` values from the seed.
    - Afterwards it turns the faults off and calls `settle`.

- [ ] **Step 1: Write the conformance tests**, each over seeds 1 to 20 (`test.each`):
  - **Convergence:** after `runScript`, every device of the same user has a deep-equal `state()`, with no pending operations.
  - **Matches the server:** each user's state equals `materialize` over every operation the server's `GET /sync/pull?after=0` returns for that user.
  - **Field-level merge:** a scripted case where two devices edit `title` and `notes` of one task offline keeps both.
  - **Newest wins:** a scripted case where three devices rename one task offline with known HLCs gives the highest-HLC title everywhere.
  - **Catch-up:** one device stays offline while another makes 2,000 changes. It reconnects through a faulty transport and converges (Review Focus 4).
  - **Grant changes while offline:** bob's device is offline while alice shares House, edits it, removes bob, and re-shares it. Bob reconnects and converges to the same House state as alice (Review Focus 3).
  - **Idempotent retries:** with `dropReply 0.5` and `duplicate 0.5`, the server's `operations` count equals the number of distinct operation IDs created.
- [ ] **Step 2: Run** `pnpm vitest run apps/server/test/conformance`. Expected: fix any divergence at its root, adding a unit test in the owning module first, until all seeds PASS. A failing seed is kept in `test.each` as a regression case.
- [ ] **Step 3: Check the runtime:** the whole conformance file runs in under 60 s in CI. If it doesn't, reduce `steps`, not the seed count.
- [ ] **Step 4: Run** the full suite. Expected: PASS.
- [ ] **Step 5: Commit** with the message "Add the sync conformance suite with fault injection".

### Task 13: Container image and self-hosting

**Files:**
- Create: `apps/server/Dockerfile`, `compose.yaml` (repo root), `docs/self-hosting.md`, `.dockerignore`
- Modify: `.github/workflows/ci.yml` (a job that builds the image and runs the smoke test), `docs/open-items.md` (next steps: plan 2 done, plan 3 next)
- Create: `apps/server/test/smoke.sh`

**Interfaces:**
- Produces:
  - **The image:** a multi-stage build on `node:26-slim`, using `pnpm deploy --prod` for `@tdl/server`. It runs as a non-root user, `CMD ["node", "src/main.ts"]` (type stripping), and exposes 3000 with a `HEALTHCHECK` on `/health`.
  - **`compose.yaml`:**
    - Services: `db` (`postgres:18`, with a volume and a health check) and `server` (the image; `DATABASE_URL`, `AUTH_SECRET`, `ORIGIN` and `TRUST_PROXY`, read from `.env`).
    - The server depends on the database being healthy, and runs migrations on start (Task 5's `main.ts`).
  - **`docs/self-hosting.md`:** requirements; `.env` values; `docker compose up -d`; putting it behind a reverse proxy with HTTPS (cookies, websockets); backup and restore with `pg_dump`/`pg_restore`, noting that a restore can bring back data deleted since the backup, so the admin re-handles those deletions (`server-backups.md`); and upgrading.
  - **`smoke.sh`:** `docker compose up -d --wait`, then sign up, log in, `GET /me`, and `docker compose down -v`. It exits non-zero on any failure.

- [ ] **Step 1: Write** `smoke.sh` first, and run it. Expected: FAIL, since there's no image or compose file.
- [ ] **Step 2: Implement** the Dockerfile, compose file and documentation.
- [ ] **Step 3: Run** `apps/server/test/smoke.sh`. Expected: PASS. Then add the CI job and push. Expected: CI is green, including the image build and smoke test.
- [ ] **Step 4: Update** `docs/open-items.md` next steps: plan 2 is done, and plan 3 (apps and the homelab deployment) is next. Commit with the message "Package the server as a container with a Compose file and self-hosting guide".

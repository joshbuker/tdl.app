# Thin slice design

## Intent

The first code of attempt #4: a minimal app that runs end to end through every risky layer, so that sync, auth, sharing and the dependency graph are proven before features are built on them. The 2025 prototype stalled at exactly this layer (an auth proxy around PouchDB and CouchDB), and #3 couldn't check its graph beyond a fixed depth. If anything in the chosen stack is going to stall the project, it should fail here, cheaply.

It is **the real start of the codebase**: built test-first per [Test-driven development](../../design-decisions/test-driven-development.md) and kept. It isn't a throwaway prototype.

## Success: what the author wants to see working

In the author's words, plus the four additions they accepted:

1. **Offline sync from phone to laptop:** edit on the Android phone with no signal, reconnect, and the changes appear on the laptop.
2. **Near-live notes across users:** two people with access to the same task each see the other's saved edits to its notes within a second or two. Simultaneous typing in the same notes (Google Docs style) is v2. In v1, the newest save wins, and the other version stays in the task's history.
3. **Prerequisites and next up through the real database:** links are stored on the server, synced, and next up is computed correctly from them on every device.
4. **Graph checks with no depth limit:** cycle and redundancy checks follow chains of any length. #3's ORM could only check a fixed depth.
5. **Revoking access:** when the owner removes someone from a shared list, or they leave it, the server stops sending them its changes and refuses their edits.
6. **Offline graph conflicts:** two offline devices each add a link, and together the links form a loop. Both links are kept and the loop is flagged.
7. **Logging out and revoking a device:** a lost phone can be cut off from another device. An explicitly revoked device deletes its local data, including unsynced changes, when it next reaches the server. A session that expires or ends any other way keeps the data and unsynced changes, and asks the user to log in again.
8. **Long-offline catch-up:** a device offline for days, while another makes many changes, catches up correctly on reconnecting.

## Goals

- Prove the custom sync protocol (see [Custom sync](../../design-decisions/custom-sync.md)) on real devices against a real self-hosted server.
- Prove that the server enforces grants on every operation, using the shared grant resolver (see [Container and item grants](../../design-decisions/container-and-item-grants.md)), for grants on both lists and single tasks.
- Prove the shared domain package runs unchanged on the server, in the browser, on Android and in Electron.
- Prove the self-hosting path: a Docker Compose stack anyone could run.
- Set up the project's skeleton, tooling and CI, so features can follow spec by spec.

## Non-goals

- **iOS.** The author has no Apple device. The code shouldn't rule it out, but iOS isn't built or tested in the slice.
- **A polished UI.** Plain Quasar components, enough to drive the scenarios. No graph view, calendar, tree view, filters or presets.
- **Features outside the scenarios below:** tags, deadlines, reminders, notifications and push, attachments, comments, recurring tasks, subtasks, search, import and export, billing, admin, API tokens, OAuth, MCP, passkeys and TOTP, email (verification and reset), translations beyond English.
- **Google Docs-style text merging** (v2).
- **End-to-end encryption** (v2). The sync format still separates content from routing metadata (see below).
- **App store releases.** Android is a sideloaded build, and Electron runs from a local build.

## Anti-goals

The slice fails even if it technically works when:

- **Graph logic or access checks are written twice** (e.g. a separate server query and device implementation that could drift), as in #3.
- **Domain logic lives in Vue components, Fastify handlers or SQL.** It belongs in framework-independent packages, as the TDD decision requires.
- **The server depends on reading content** (anything outside the routing metadata) to route or authorize. That would block v2 encryption. Validation is different: in v1 the server also runs the shared validation on content (see [Strict validation](../../design-decisions/strict-validation.md)), in one isolated step that v2 can drop.
- **Building infrastructure crowds out the scenarios.** Sync is only built as far as these scenarios need.
- **Any dependency fails the licence rules** (see [Licence and pricing](../../design-decisions/licence-and-pricing.md)).

## Constraints

Everything decided in `docs/design-decisions/` applies. Most relevant:

- **Stack:**
  - [TypeScript everywhere](../../design-decisions/typescript-everywhere.md).
  - [Vue and Quasar](../../design-decisions/vue-and-quasar.md), with Quasar's Capacitor mode for Android and its [Electron mode](../../design-decisions/electron-desktop.md) for desktop.
  - [Node and Fastify](../../design-decisions/node-and-fastify.md), [Postgres on the server](../../design-decisions/postgres-on-the-server.md) and [Drizzle](../../design-decisions/drizzle.md).
  - [Better Auth](../../design-decisions/better-auth.md) and [UUIDv7 IDs](../../design-decisions/uuidv7-ids.md).
- **Sync:** [Custom sync](../../design-decisions/custom-sync.md).
  - Field-level operations stamped with a hybrid logical clock, held in an outbox on the device.
  - The server assigns sequence numbers, checks grants, and keeps every operation forever.
  - A websocket tells devices when there's something new, and devices pull everything after their last sequence number.
  - Each operation keeps the routing metadata listed in [End-to-end encryption](../../design-decisions/end-to-end-encryption.md) separate from its content.
- **Device storage:** SQLite on every device: the official SQLite WebAssembly build on the web, a Capacitor SQLite plugin on Android, and native SQLite in Electron's Node process behind a small typed IPC layer. One storage interface, with each platform implementing it.
- **Links:** at most one active link per pair of tasks. If two devices add the same link offline, the server refuses the second as a duplicate. That's a uniqueness rule, not a graph rule. The device then folds its link into the existing one, applying its kind and reason as ordinary edits (newest wins).
- **Graph rules:** run on the device in shared TypeScript, over the user's visible graph in memory. The server never undoes a link for breaking a graph rule (see [Offline first](../../design-decisions/offline-first.md)). It does check access.
- **Tests:**
  - Acceptance tests are plain Vitest (domain and API) and Playwright (web UI) tests, named exactly after the spec's feature and scenario.
  - A CI script fails on any scenario without a test or any test without a scenario. It checks only the scenarios in scope (see below), and every scenario once a spec is meant to be `Implemented`.
- **Translations:** user-facing strings go through vue-i18n from the start (see [Translations from day one](../../design-decisions/translations-from-day-one.md)), English only.
- **Workflow:** spec first. Any behavior the slice needs that no spec describes gets a spec change before code.

## Scenarios in scope

Each is an existing scenario, implemented with an acceptance test of the same name. A spec is only marked `Implemented` when all of its scenarios pass, so most stay `Specified` or `Proposed` after the slice.

- **[Sign up](../../features/account/sign-up.md):** Sign up. The server runs with email verification off, since no email is configured.
- **[Login](../../features/account/login.md):** Log in, Log in with email, Wrong password, Not logged in, Session expires in place, Revoke a lost device, Log out.
- **[Create a task](../../features/tasks/create-task.md):** Create a task with a title, Title is required, Surrounding whitespace is stripped, Duplicate titles are allowed.
- **[Edit a task](../../features/tasks/edit-task.md):** Rename a task, Edit notes, Navigate to a linked task.
- **[Complete a task](../../features/tasks/complete-task.md):** Complete a task, Mark a task incomplete again.
- **[Lists](../../features/organization/lists.md):** Create a list. The Inbox is created at sign-up as the default list.
- **[Link tasks](../../features/dependencies/link-tasks.md):**
  - Add a prerequisite
  - Reject a cycle
  - Reject a redundant link
  - Cycles through completed tasks are still rejected
  - Completed tasks don't make links redundant
  - Remove a link
  - Existing link that becomes redundant is kept
  - Can't link a task to itself
  - Link already exists
  - Both tasks must be editable
- **[Next up](../../features/dependencies/next-up.md):** Unblocked task is next up, Blocked task is not next up, Completing a prerequisite unblocks, Marking a prerequisite incomplete blocks again.
- **[Offline use](../../features/app/offline.md):** Create offline, Link offline, Conflicting edits keep the most recent, Links that together form a cycle, Live updates, Rejected offline changes are kept.
- **[Sharing](../../features/app/sharing.md):**
  - Share a list (Bob accepts an invitation, as the Sharing rules say)
  - Share a single task
  - Viewer can't edit
  - Leave a shared list
  - Hidden blocker
  - Loop only another user can see
  - Remove a collaborator (added to the spec for the slice).
- **[Task history](../../features/tasks/task-history.md):** a minimal history view, enough for "Conflicting edits keep the most recent" to show both renames. Its own scenarios are out of scope unless they come for free.

Plus tests that aren't spec scenarios:

- **Unbounded depth:** unit tests run cycle, redundancy and next-up checks on a chain long enough to rule out any fixed depth (1,000 tasks), and on wide graphs. They also set a performance budget (e.g. a cycle check on a few thousand tasks stays well under 50 ms).
- **Sync conformance suite:** a deterministic harness with simulated devices and a real server. It drops, delays, duplicates and reorders messages, and covers:
  - field-level merges, including edits to different fields;
  - newest-wins conflicts;
  - catch-up after many changes;
  - grant changes while a device is offline;
  - idempotent retries (sending the same operation twice changes nothing).
- **Access checks:** unit tests for the grant resolver, and API tests showing the server refuses operations outside a user's grants. This includes moving a record to something the user doesn't own, which was #3's bug.

## Demo checklist (done means all of these work by hand)

On the homelab server, with the Android phone, a laptop browser and the Electron app:

1. Sign up as "alice" in the browser, and as "bob" on another device.
2. On the phone, in airplane mode, create tasks, edit notes and link a prerequisite. Reconnect, and the laptop shows the changes.
3. Alice shares a list with Bob. Each edits a task's notes, and the other sees the change within a second or two.
4. Build a chain of prerequisites. Next up shows only the unblocked task. Completing it unblocks the next. An attempt to close a loop is rejected, even across a long chain.
5. With both devices offline, each adds a link so that together they form a loop. After syncing, both links exist and the loop is flagged.
6. Alice removes Bob. His view of the list disappears, and an edit he made offline shows under "couldn't sync".
7. Log out on the phone and back in. From the laptop, revoke the phone's session: it stops syncing, and when it next connects it deletes its local data. Separately, let a session expire: the phone keeps its unsynced changes and asks to log in.
8. Leave the phone offline while the laptop makes many changes. On reconnecting, the phone catches up.

## Deployment

- **Packaging:** the server ships as a container image, run with Postgres from a Docker Compose file. The Compose file and a short self-hosting README in the repo are deliverables, not homelab-only config.
- **Homelab:** the author's homelab, on a NixOS VM with Docker under Proxmox.
  - The author's existing reverse proxy terminates HTTPS with a valid certificate for `tdl.app` (e.g. from a Let's Encrypt DNS challenge).
  - Local DNS points `tdl.app` at it.
  - HTTPS is required for cookies, websockets and, later, passkeys on Android and in browsers.
- **Apps:** the web app is served by the same server or the proxy (builder's call). Android is a sideloaded debug or release build, and Electron a local build. Both apps point at `tdl.app`, using the choose-server mechanism from [Choose a server](../../features/account/choose-server.md) or a build-time default.
- **CI:** GitHub Actions on the `joshbuker/tdl.app` repo, on every push and weekly on main (see [Releases and CI](../../design-decisions/releases-and-ci.md)). It runs:
  - type checks and lint, including the vue-i18n key rules;
  - unit tests;
  - the sync conformance suite;
  - the API acceptance tests against Postgres;
  - Playwright on the web app;
  - the scenario coverage check.

  Android and Electron are checked by hand in the slice.

## Left to the builder

- **Repository layout,** e.g. a pnpm workspace with:
  - `packages/domain` for graph rules, grants and next up;
  - `packages/sync` for the protocol, HLC, outbox and merge;
  - `apps/server`;
  - `apps/client` for Quasar.
- **Package choices within the decisions,** and checking licences and current versions (Capacitor SQLite plugin, TanStack DB or another reactive store, the websocket library, the schema library and its Fastify adapter).
- **Device schema and server schema details,** and how history is stored and queried.
- **The order of work,** as long as the first milestone is the thinnest possible end-to-end path: one task created on one device and seen on another, through the server.
- **How minimal the UI is,** within the scenarios.
- **Whether the web app is served by the Fastify server or separately.**

## Calls made without the author (check these)

- iOS is out of the slice.
- The scenario "Edits to different fields merge" is out of scope because it needs deadlines. Field-level merging is covered by the sync conformance suite instead.
- Email verification is off on the slice server, so password reset by email is out of scope.
- A new "Remove a collaborator" scenario is added to the Sharing spec.
- The CI provider is GitHub Actions.
- The server runs the shared validation on content in v1, as the Strict validation decision says.
- Sharing a list goes through an invitation that the recipient accepts, as the Sharing spec says.
- Duplicate links from offline devices are refused by the server's uniqueness rule and folded into the existing link on the device.

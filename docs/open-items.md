# Open items

Cross-cutting questions and follow-ups that don't belong to a single feature spec. Per-feature questions live in each spec's "Open questions" section; list them with:

```sh
grep -rn -A12 "## Open questions" docs/features
```

Like the rest of `docs/`, this file is evergreen: remove an item once it's resolved or recorded elsewhere.

## Next steps

The stack is chosen (each choice is a record in `design-decisions/`), except the payment provider, which is decided before launch (below). End-to-end encryption moved to v2.

Build the [thin slice](superpowers/specs/2026-11-10-thin-slice-design.md) from its plans, in order. It proves sync, auth and sharing end to end before features, per [Lessons from previous attempts](lessons-from-previous-attempts.md).

1. [Foundation and domain](superpowers/plans/2026-11-10-thin-slice-1-foundation-and-domain.md): done and merged into `main` (reviewed, CI green). Deferred review findings are listed below under "Follow-ups from plan 1".
2. [Sync and server](superpowers/plans/2026-11-11-thin-slice-2-sync-and-server.md), from the [sync protocol design](superpowers/specs/2026-11-11-sync-protocol-design.md): done and merged into `main` (PR #1: reviewed, CI green, including the container image smoke test). It includes the container image, Compose file and [self-hosting guide](self-hosting.md). Deferred review findings are listed below under "Follow-ups from plan 2".
3. [Web app](superpowers/plans/2026-11-13-thin-slice-3-web-app.md): in progress on branch `thin-slice-3-web-app` (not pushed). Tasks 1 to 5 are done and reviewed; resume at Task 6, live-update authentication. The task-by-task ledger, with deferred review findings and rulings, is in the git-ignored `.superpowers/sdd/2026-11-13-thin-slice-3-web-app/progress.md` on the machine that ran it. It includes the sync and server groundwork below, the device storage and app core that Android and Electron reuse, and the homelab deployment for the browser demo.
4. Android and Electron: after plan 3. Covers the Capacitor and Electron SQLite drivers, bearer-token platforms, the Capacitor and Electron Quasar modes, and the phone and desktop parts of the demo checklist. Researched 2026-11-13:
   - **Android SQLite:** `@capacitor-community/sqlite` 8.x (MIT, Capacitor 8). `@capgo/capacitor-fast-sql` (MPL-2.0) is the fallback if bridge throughput is a problem. `@capawesome-team/capacitor-sqlite` fails the licence rules (paid), and `jeep-sqlite` is unmaintained since 2024.
   - **Quasar's Capacitor mode** uses Capacitor 8, with `src-capacitor/` as its own pnpm install root. Keep the default `https://localhost` origin.
   - **Electron:** 45 (Node 24, Chromium 156). SQLite through `node:sqlite` in the main process (release candidate stability), with `better-sqlite3` 13 (MIT, Node-API prebuilds) as the drop-in fallback. Quasar's Electron mode defaults to `@electron/packager`.

   Decided for plans 3 and 4:
   - **Live updates:** built, as decided in [Live-update authentication](design-decisions/live-update-authentication.md): cookie for the browser web app, session token in the first message for everything else, an `Origin` allow-list scoped by credential (`APP_ORIGINS`), and CORS for the Capacitor apps. Electron's window origin is still to confirm when the Electron app is built.
   - **An oversized push blocks a device's sync for good.** Titles, notes and link reasons have no maximum length (`packages/domain/src/fields.ts`), and the Replica batches pushes by count only (500 operations). A body over the server's 1 MiB limit is answered 413, the HTTP transport throws a plain error, and `syncOnce` rethrows it, aborting both push and pull. The sync status stays `ok`, and every later sync fails the same way. Decided:
     - **Maximum field lengths**, which also stop abuse: task and list titles 500 characters (Todoist's limit for task names), notes and link reasons 100,000 (at most 400 KB in UTF-8, so one operation always fits). Specs updated.
     - **Batching pushes by size** as well as count, so no batch passes the server's limit.

     Version mismatches are now covered by [Version compatibility](features/app/version-compatibility.md) and [Protocol versions](design-decisions/protocol-versions.md): changes stay queued, and the app shows an "update to sync" status. Plan 3 needs the version exchange, an outdated status, and lenient parsing of pulled pages (today one unknown record type or kind of change stops sync). A refused sync shows a "sync stuck" indicator with the reason, and every change stays queued in order (see [Offline use](features/app/offline.md)). So that only temporary causes can refuse a whole push, plan 3 also:
     - **Checks each operation's shape on its own** on the server: today `/api/sync/push` validates the whole body against `pushRequestSchema`, so one malformed operation refuses all 500 with a 422. It should become a per-operation `invalid` rejection, which goes to the "couldn't sync" view like any other.
     - **Batches pushes by size**, so no push hits the 413 limit.

     Rejected: moving the operations of a refused push to the "couldn't sync" view so later ones sync. With the above, no known cause refuses a push for good, and splitting the queue would leave dependent changes to tidy by hand. If an unforeseen cause appears, a possible escape hatch is letting the user move the blocking change aside from the stuck indicator.

## Deferred past the thin slice

- **Detecting concurrent edits**, for history's "overridden" and "double completion" flags (see [Task history](features/tasks/task-history.md)). The slice's history lists operations in clock order, without the flags. Options:
  - **Parent operation ID:** each content operation names the operation it replaces, like a Git parent commit. Two operations with the same parent are concurrent. Adds one field to the operation format.
  - **What the author had seen:** each operation records the last feed position its device had applied. Feed positions are numbered per person, so this breaks on shared tasks unless the server translates them.
  - **Vector clocks:** exact, but each operation carries a counter per device.

- **Breached-password check** at sign-up (see [Account details](features/account/user-validation.md)). The slice checks length only. Options:
  - **Allow the password if Have I Been Pwned can't be reached**, logging a warning. Self-hosted servers without internet still work.
  - **Refuse sign-up if it can't be reached.** Strict, but self-hosters without outbound internet couldn't sign anyone up.
  - **Make it a server setting**, on by default, so self-hosters without internet can turn it off.

- **Devices after a server restore.** Restoring a backup (see [Self-hosting](self-hosting.md)) rewinds the server's feed, so feed IDs that devices already pulled are handed out again for new entries, and devices that pulled past the backup would skip them. Devices may also hold changes the server acknowledged after the backup and has now lost. Options:
  - **Server instance ID:** the server keeps a random ID that a restore changes (e.g. the admin runs a command after restoring); pulls return it, and a device that sees a new one pulls its whole feed again and re-sends its own operations.
  - **Feed IDs that never repeat across restores**, e.g. starting each server start above the highest ID ever issued, kept outside the database. Devices still need to detect the gap to re-send lost changes.
  - **Document it only:** after a restore, every device signs out, clears its local data and signs in again. Changes made after the backup are lost.

## Current state and history: constraints for later

Left from an audit of every spec against [Current state and history](design-decisions/current-state-and-history.md) on 2026-11-11.

- **Compaction** ("may be needed later", [Offline first](design-decisions/offline-first.md)) must not drop operations that task history, undo or metrics need.

## Follow-ups from plan 1

Minor findings from plan 1's final review, deferred. Fix each when its area is next touched:

- A title of only U+0085 (next line) is accepted, because `String.prototype.trim` doesn't strip it. Zero-width characters (U+200B, U+180E) are accepted too. Decide whether they count as blank.
- `checkNewLink` accepts a task ID missing from the graph when `canEdit` allows it, e.g. if the access data and the task list disagree. It should reject such IDs as `not-editable`.
- `redundantLinkIds` slows down on very high fan-out (about 300 ms for one task with 3,000 postrequisites). Check before graph views call it on every render.
- `buildGraph` indexes a link twice if the same record is passed twice.
- Licence exceptions are keyed by package name only, so a package that later changes licence would still pass. Key them by name and licence.
- The CI workflow has no `permissions: contents: read` block.
- The scenario check ignores `~~~` code fences, doesn't report two tests for one scenario, and lets two specs with the same title collide.
- Add a randomized test comparing the pruned redundancy search with the unpruned `hasPath`.

## Follow-ups from plan 2

Findings from plan 2's final review, deferred. The plan 3 blocker is under "Next steps".

- **Push must stay push-before-pull.** A constraint on any refactor of `Replica.syncOnce`: if sync pulled first, an operation whose reply was lost could be forgotten by the pull and then re-added by the retry's `accepted`, leaving a confirmed operation for a record the device no longer has.
- **Global feed-write lock.** Every write on the server takes one lock, so writes run one at a time. Fine for the slice. Options if write load grows:
  - **Keep the global lock.**
  - **Pull watermark with finer-grained locks:** pulls stop at the highest feed ID below which every ID has committed, so writers no longer need to commit in order.
- **Unindexed scans on `operations`**, run under the global lock on every `moveTask`, grant and revoke: the history query filters `record_id` without `record_type`, so the `(record_type, record_id)` index isn't used, and `linksTouching` filters `meta->>'kind'` with no index. Options:
  - **Add an index** on `operations(record_id)`, and expression indexes on the two ends of `createLink`.
  - **Filter by type and ID pairs**, so the existing index applies.
- **End-to-end encryption (v2) and the Inbox:** the server can't write an encrypted title, so Inbox creation, at sign-up and when `GET /api/me` repairs a missing one, moves to the device. Two devices could then each create one. Options:
  - **Derive the Inbox ID from the user ID**, so both devices write the same record.
  - **Create the list on the server without content**, and let the device name it.
- **An existing but invisible ID answers `forbidden`**: `createList`, `createTask` or `createLink` with an ID that already exists where the user can't see it. The [error contract](design-decisions/error-contract.md) says they learn nothing, but UUIDv7 IDs make probing impractical. Options:
  - **Answer `not-found`**, or a generic conflict code.
  - **Leave it as is.**
- **Spec wording in [Sharing](features/app/sharing.md), "Grants only add access":** its Given (bob is an editor of House, then alice shares Paint fence with him as a viewer) can't be set up through the API, because the server refuses a lesser grant as `already-shared`. Options:
  - **Reword the Given** so the task grant comes first.
  - **Allow lesser grants.**
- **Device clocks far in the future** win newest-wins for good if a device's clock is wrong. Options:
  - **Reject** operations whose HLC is beyond now plus a margin.
  - **Clamp** such HLCs to now plus the margin.
  - **Leave it.**
- **Rate limiting:** `@fastify/rate-limit` is registered with `global: false`, but no route opts in, so it does nothing. Sign-up and sign-in rely only on Better Auth's limiter, which is on only when `NODE_ENV=production` and untested. Sync, invitation and session routes are unlimited. Options (possibly combined):
  - **Opt routes in** to `@fastify/rate-limit`.
  - **Remove the plugin** and rely on Better Auth and the reverse proxy.
  - **Test Better Auth's limiter.**
- **Duplicate grants:** two pending invitations for the same person and target, both accepted, make two grants, because accepting doesn't re-check `already-shared` and `grants` has no unique constraint on user and target. Removing the collaborator then takes two deletes. Options:
  - **A unique constraint, and a re-check on accept.**
  - **No duplicate invitations:** refuse or reuse one at creation.

## Ideas for later

Ideas from earlier notes that aren't planned for v1, kept so they aren't lost. Each becomes a spec when it's picked up.

Sources: earlier notes (titles in brackets) and Todoist tasks (marked "Todoist").

- **Per-person completion on shared tasks**: a task that each person completes for themselves (e.g. "Read the house rules"), instead of once for everyone. Complicates next up, which would differ per person. [TDL App Shared Tasks]
- **Voice capture** through Google Assistant, for hands-free use. [Backlog]
- **Custom recurrence from data streams**: e.g. "every 6 months or 3,000 miles, whichever comes first", with the car or another device sending readings (IoT, CAN bus, IFTTT-style triggers, or external APIs). Recurrence rules are kept API-ready for this (see [Recurring tasks](features/scheduling/recurring-tasks.md)). [Backlog, Todoist: "Support custom task recurrence via external APIs", "Support tasks recurring based on multiple values", "Support car sending odometer values to TDL App"]
- **Calendar integration**: external events as fixed blocks for the [Auto-scheduler](features/scheduling/auto-scheduler.md). [Motion UI Case Study]
- **Links to documents** (e.g. Google Docs) on tasks. [2021-05-13 call notes]
- **Time tracking and billing**: logged time, minimum billable blocks, per-client invoicing, hour budgets with follow-up tasks. [2021-05-13 call notes]
- **Contacts and approvers** attached to tasks. [2021-05-13 call notes]
- **Barcode scan** to add to a grocery list. [Backlog]
- **Habits tab**: dailies with streaks (if streak stats need more than the recurring outcome field in history, consider an occurrence record per completion or skip), haptic and light feedback, and long-term completion tracking, plus a quest system. [Repeated Tasks, Backlog, Todoist: "Add daily dopamine functionality to TDL"]
- **Schedule tab**: an intelligent view of what to prioritize now. Partly covered by presets and sorts, and by [Focus](features/views/focus.md) in v2. [Todoist: "Schedule tab (intelligent view that shows you what to prioritize)"]
- **Random task roulette**: pick a next-up task for the user. [Backlog]
- **Overload heatmap** on the calendar. [Backlog]
- **Milestones, missions and visions** above tasks, with rewards for milestones. [Dimensionality]
- **Cost field** on tasks. [Features that Kurt wants]
- **Single placeholder for all of a shared task's private neighbours**, as a privacy option. [Features that Kurt wants]
- **List health and planning stats**: how interconnected a list is, estimate accuracy, time spent organizing. [Features that Kurt wants]
- **Prompt to break a task down** when its estimate is above the user's usual size or it overruns. [Work Breakdown Structure]
- **Weekly review**: a retro (went well, improve, stop, start) and the full GTD weekly review. [Deep Procrastination, GTD Weekly Review Process]
- **Quick-add from the phone home screen** (widget or shortcut). [2021-05-12 call notes]
- **Text abbreviations** that expand while typing. [2021-05-12 call notes]
- **Informational tasks** that can't be completed (Todoist's `* title`). [Todoist features we like]
- **Deadline presets** in a quick menu. [Features that Kurt wants]
- **Sign-up extras**: OAuth sign-up (Google, Facebook), a setup wizard with default lists and tags, a given-name-first or family-name-first option. [Creating an Account UI Flow]
- **Gravatar, an About page, and Android back-button support.** [Backlog, Todoist features we like]
- **Community learning graphs**: shared public prerequisite graphs with articles and helpfulness scores. [Learner]
- **Email capture**: turn an email into a task with a link back, like Todoist's Gmail integration. [Todoist: "Gmail integration (ala todoist)"]
- **File over app**: tasks stored in an open file format other tools can read, beyond import and export. [Todoist: "Use a file format for tasks TDL App"]
- **Oldest overdue task** as a tracked metric. [Todoist: "Add metric tracking for Oldest Overdue Task"]
- **Recurring priority**: a recurring task's priority rises as its period ends. [Repeated Tasks]
- **Links between recurring tasks** that recur with them. Kept out of the graph for now; see [Recurring tasks](features/scheduling/recurring-tasks.md). [Features that Kurt wants]
- **Stale soft links**: offer to prune soft links between old tasks, or a mode that ignores soft links for a while. [Features that Kurt wants]
- **Free-form data field on tasks** for other apps, via the API. Integrations can key their own data by task ID until then. [Backlog]
- **Time-of-day constraints on next up**, e.g. "bank, weekdays 9 to 5". Recorded as an open question in [Auto-scheduler](features/scheduling/auto-scheduler.md). [Todoist: "Add time of day constraint for next actions"]
- **Energy levels**: mental and physical energy on tasks, to filter by "what fits how I feel". The time-available filter is in v1. [2021-12-15/16/19 TDL x GTD, TDL App Models]
- **Project records**: active, paused or completed, with success criteria, a reward, an estimate and sub-projects. v1 shows progress on a final task instead (see [Edit a task](features/tasks/edit-task.md)). [2021-12-22 TDL x GTD, TDL App Models, 2021-12-10 GTD]
- **Composite priority score**: weighing due dates, duration, a "needs breakdown" flag and age, beyond the separate sorts. [2024-09-21 TDL App Agenda View Breakdown]
- **Someday/maybe** with review reminders, for [Triage review](features/scheduling/triage-review.md), which has no someday state. A 2025 review log calls a someday list "a graveyard". [2025-05-23 GTD Weekly Review Log]
- **Start-to-start prerequisites**: a prerequisite that unblocks once started, not finished. Needs a started state, so it waits for [Statuses](features/organization/statuses.md). [2021-10-16 TDL Idea]
- **More priority inputs**: how much stress a task causes, consequences of not doing it, timeline expectations. [2021-12-15/16 TDL x GTD]
- **Triage review extras**: append an inbox item to an existing task (e.g. as a subtask), and keep your place with Next and Back when leaving halfway. [TDL App Flows, 2021-12-19 TDL x GTD]
- **"Review by" date on captured items**, with strong warnings once passed. Partly covered by [Prioritize date](features/scheduling/prioritize-date.md). [2021-12-18 TDL x GTD]
- **Daily review**: check tomorrow's calendar, then empty the inbox. [2021-12-28 GTD x TDL]
- **Calls context**: store a phone number on a task and call in one tap. [2021-12-22 TDL x GTD]
- **Agendas** for people and meetings, added and removed ad hoc. Partly covered by tags. [2021-12-22 TDL x GTD]

## Decisions to make with the stack

Technical choices the specs leave open, to settle while choosing the stack:

- **Payment provider** for web payments, decided before launch, behind our own payment interface built now. The apps don't sell anything (see [Billing](features/account/billing.md)); check app-store rules on linking out at launch. Options:
  - **Polar** (Apache-2.0): pay-what-you-want subscriptions with a minimum built in, and merchant of record (handles sales tax and VAT). About 4–5% plus 40–50¢ per payment.
  - **Stripe**: established, lowest fees, but its pay-what-you-want checkout doesn't do subscriptions, so it needs workarounds. Sales tax is ours to handle unless we use Stripe's merchant-of-record product.
  - **Paddle or Lemon Squeezy**: merchants of record, but no confirmed support for pay-what-you-want subscriptions.

## Decisions for v2

- **Statuses and the Trash**: should a task in the Trash count as using its status, which blocks deleting the status (see [Statuses](features/organization/statuses.md))? Options: no, and a restored task gets its list's default status for its category; or yes, so the status can't be deleted until those tasks leave the Trash.
- **Encryption and history:** after re-keying, older history is under older keys, so new collaborators and recovery through a collaborator need those keys too. Belongs with the cryptographic design below.
- **Federation and history:** permanent deletion, purges and forgetting must reach other servers' copies. And when an editor takes over a list, its history moves with it, possibly incomplete, since their server only has what its own users could see.
- **Cryptographic design**: the password protocol (e.g. OPAQUE or SRP), the key hierarchy and re-keying when someone is removed, the device-approval protocol, and deriving keys from passkeys (WebAuthn PRF, not yet on every platform). How a list invite link hands over keys (e.g. in the link's fragment) and how users can verify each other's keys.

## Stack constraints

Requirements gathered so far that the stack must support:

- One shared implementation of domain logic (graph rules, filtering and sorting, sync) running on both device and server.
- Offline sync with IDs generated on the device.
- A sync protocol that serves both devices and other servers, with field-level change tracking, automatic merges, full change history, and later user-resolved conflicts and a text merge for notes (v2) (see [Offline use](features/app/offline.md) and [Federation](features/app/federation.md)).
- Server-to-server request signing (HTTP Message Signatures) and WebFinger lookup, for federation (v2).
- Web, Android, iOS and desktop.
- Good tooling for both unit and acceptance tests.
- Server-pushed live updates to open apps (e.g. websockets or server-sent events).
- Calendar dates and RFC 9557 zoned date-times, with the IANA time zone database (see [Floating dates, zoned times](design-decisions/floating-dates-zoned-times.md)).
- A public, versioned API documented with OpenAPI generated from tests, OAuth for third-party apps, an API client library that decrypts on the caller's side, and an MCP server that runs locally (in the desktop app and as a standalone program) on top of that library (see [API access](features/app/api-access.md) and [MCP server](features/app/mcp-server.md)).
- Scheduled local notifications on Android, iOS and desktop for reminders (the web app fires them only while open), and push notifications for everything else (see [Reminders](features/scheduling/reminders.md)).
- A payment provider for pay-what-you-want subscriptions on tdl.app, optional on self-hosted servers (see [Billing](features/account/billing.md)).
- Encrypted file storage for attachments, with per-file and per-account limits.
- Room for end-to-end encryption in v2 on every platform with well-reviewed libraries: per-user key pairs, per-list, task and tag keys shared with grants, a password protocol that never gives the server the key, and a client library for API users (see [End-to-end encryption](design-decisions/end-to-end-encryption.md)). Sync must separate content from routing metadata from v1.
- Passkeys (WebAuthn) for passwordless login and as a second factor, plus TOTP (see [Multi-factor authentication](features/account/multi-factor-authentication.md)).
- Deep links that open the installed app from a web address (universal links and app links), falling back to the web app (see [Deep links](features/app/deep-links.md)).
- Translation tooling that fails CI on missing or unused keys (see [Translations from day one](design-decisions/translations-from-day-one.md)).
- Simple self-hosting: the server plus Postgres, as two containers, with documented backup and restore (see [Self-hosting](design-decisions/self-hosting.md) and [Server backups](design-decisions/server-backups.md)).
- Every dependency compatible with AGPLv3, and free with every feature we use: no open-core or freemium libraries with paid tiers we'd need, no paid scaling, and no source-available licences (FSL, BSL, SSPL), so self-hosting stays free and complete (see [Licence and pricing](design-decisions/licence-and-pricing.md)).
- An open-licence icon set that works on every platform (e.g. Material Symbols or Lucide), for list icons.

See also [Lessons from previous attempts](lessons-from-previous-attempts.md).

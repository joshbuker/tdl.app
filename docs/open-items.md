# Open items

Cross-cutting questions and follow-ups that don't belong to a single feature spec. Per-feature questions live in each spec's "Open questions" section; list them with:

```sh
grep -rn -A12 "## Open questions" docs/features
```

Like the rest of `docs/`, this file is evergreen: remove an item once it's resolved or recorded elsewhere.

## Next steps

- Finish choosing the stack, recording each choice as a design decision. Decided so far: [TypeScript everywhere](design-decisions/typescript-everywhere.md), [Electron desktop app](design-decisions/electron-desktop.md) through Quasar's Electron mode, [Vue and Quasar](design-decisions/vue-and-quasar.md), [Custom sync](design-decisions/custom-sync.md), [Postgres on the server](design-decisions/postgres-on-the-server.md), [Better Auth](design-decisions/better-auth.md), a shared grant resolver (see [Container and item grants](design-decisions/container-and-item-grants.md)), [Node and Fastify](design-decisions/node-and-fastify.md), [Drizzle](design-decisions/drizzle.md), [UUIDv7 IDs](design-decisions/uuidv7-ids.md), vue-i18n (see [Translations from day one](design-decisions/translations-from-day-one.md)), acceptance tests named after scenarios (see [Test-driven development](design-decisions/test-driven-development.md)), the [Push relay](design-decisions/push-relay.md) with UnifiedPush, the plaintext metadata boundary (see [Custom sync](design-decisions/custom-sync.md)), and end-to-end encryption moved to v2. Next: write the implementation plan for the [thin slice](superpowers/specs/2026-11-10-thin-slice-design.md), then build it. Start from:
  - "Decisions to make with the stack" and "Stack constraints" below;
  - [Launch scope](design-decisions/launch-scope.md) and [Offline first](design-decisions/offline-first.md), which shape the stack most, and [End-to-end encryption](design-decisions/end-to-end-encryption.md), deferred to v2 but which v1 must leave room for;
  - the process lessons in [Lessons from previous attempts](lessons-from-previous-attempts.md): prove sync, auth and sharing with a thin end-to-end slice before building features.

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
- **Habits tab**: dailies with streaks, haptic and light feedback, and long-term completion tracking, plus a quest system. [Repeated Tasks, Backlog, Todoist: "Add daily dopamine functionality to TDL"]
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

# Open items

Cross-cutting questions and follow-ups that don't belong to a single feature spec. Per-feature questions live in each spec's "Open questions" section; list them with:

```sh
grep -rn -A12 "## Open questions" docs/features
```

Like the rest of `docs/`, this file is evergreen: remove an item once it's resolved or recorded elsewhere.

## Next steps

- Choose a stack, recording the choice as a design decision (see "Stack constraints" below).

## Ideas for later

Ideas from earlier notes that aren't planned for v1, kept so they aren't lost. Each becomes a spec when it's picked up.

Sources: earlier notes (titles in brackets) and Todoist tasks (marked "Todoist").

- **Per-person completion on shared tasks**: a task that each person completes for themselves (e.g. "Read the house rules"), instead of once for everyone. Complicates next up, which would differ per person. [TDL App Shared Tasks]
- **Voice capture** through Google Assistant, for hands-free use. [Backlog]
- **Recurrence from data streams**: e.g. car mileage, "time or mileage, whichever first", IFTTT-style triggers. [Backlog]
- **Calendar integration**: external events as fixed blocks for the [Auto-scheduler](features/scheduling/auto-scheduler.md). [Motion UI Case Study]
- **Links to documents** (e.g. Google Docs) on tasks. [2021-05-13 call notes]
- **Time tracking and billing**: logged time, minimum billable blocks, per-client invoicing, hour budgets with follow-up tasks. [2021-05-13 call notes]
- **Contacts and approvers** attached to tasks. [2021-05-13 call notes]
- **Barcode scan** to add to a grocery list. [Backlog]
- **Habits tab**: dailies with streaks and rewarding feedback. [Repeated Tasks, Backlog]
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
- **Monetization**: freemium vs paid from day one, per-user pricing for prosumers and small businesses, open-source free tier with a closed premium tier. No decision yet. [2021-10 business calls]

## Design decisions to write

These choices from earlier attempts have written reasoning in `historical-versions/` and look worth keeping, but have no decision record yet:

- Server-side, revocable sessions.
- Error contract: 401 unauthenticated, 403 forbidden, 404 not found, with the trade-off that 403 reveals a record exists.
- Strict input validation, with no silent normalization.
- Translations from day one.
- Version pins must say when they can be lifted.
- Releases on version tags, with CI also run weekly to catch vulnerable dependencies.
- Server backups: automated, tested database backups for tdl.app, and documented backup and restore for self-hosters, before anyone else's data is on the server. From a Todoist task.

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
- A public, versioned API documented with OpenAPI generated from tests, OAuth for third-party apps, and an MCP server built on it (see [API access](features/app/api-access.md) and [MCP server](features/app/mcp-server.md)).
- Scheduled local notifications on every platform for reminders, and push notifications for everything else (see [Reminders](features/scheduling/reminders.md)).
- Passkeys (WebAuthn) for passwordless login and as a second factor, plus TOTP (see [Multi-factor authentication](features/account/multi-factor-authentication.md)).
- An open-licence icon set that works on every platform (e.g. Material Symbols or Lucide), for list icons.

See also [Lessons from previous attempts](lessons-from-previous-attempts.md).

# Lessons from previous attempts

Bugs, gaps and pitfalls from earlier attempts, to avoid repeating in attempt #4. Code lessons come from surveying `historical-versions/` (paths are relative to it). Process lessons come from the author's notes.

## Code

- **Authorization not re-checked when moving records** (#3 API). A task's list, a subtask's task, a task's status and a user's default list could be changed to records owned by someone else, because permission was checked against the old record. #1 could link tasks across users (unscoped `Task.find_by(id:)`), and its API skipped the login check entirely.
- **Graph logic written twice** (#3). Recursive Postgres queries on the server, plus a separate browser implementation whose traversal used the wrong variable and only looked one level deep (`web.tdl.app/src/stores/tasks/task-store.ts`). This is why domain logic should have one shared implementation (see [Offline first](design-decisions/offline-first.md)).
- **SQL built by string interpolation** for recursive queries (#1, #3: "FIXME: Sanitize this query!").
- **Cycle check that ignored completed tasks** (#3) allowed real cycles once a task was marked incomplete again. Attempt #4 counts every task for cycles, and only incomplete tasks for redundancy (see [Link tasks](features/dependencies/link-tasks.md)).
- **Unclear redundancy errors** (#3). The message showed placeholder names instead of task titles, and each redundant link produced two errors. The tests asserted the buggy output.
- **Titles used as identifiers** (#1). The API referred to lists and tags by title, and the UI keyed items by title.
- **Midnight race** (#1). Date groups computed during one request could straddle midnight.
- **UI tests too coupled to test** (#3). The task dialog's component test was commented out as "way too tightly coupled".
- **Dead or orphaned code** (#3). Reminder scheduling and an undo toast existed but were never called. Several bulk endpoints routed to actions that didn't exist.
- **Model churn** (#3). Migrated to a full GTD model in Dec 2021 and back in Apr 2023, discarding most of that work (see [Dependency graph with dates](design-decisions/dependency-graph-with-dates.md)).
- **Mobile performance** (#1, #3). #1 disabled live search ("abyssmal performance on mobile"). #3 paused computed views while dialogs were open to keep the UI responsive.

## Process

- **An app you don't trust doesn't get used** (#3, Dec 2021). It filled up with non-actionable tasks, had no review process and no way to see a project's status, and tags became a blob. Trust comes from a short review loop, seeing progress, and keeping clutter out of next up.
- **Big-bang rewrites stall** (#3's GTD refactor, Dec 2021). The whole GTD model was migrated in, then back out. The note afterwards: build only the tight inbox-clearing loop first, not the full review flow. Attempt #4 cuts scope (see [Launch scope](design-decisions/launch-scope.md)) and builds spec by spec.
- **Fighting an existing codebase** (#3, 2024). Simple changes took too long because components were tangled together. The plan was to rebuild components in isolation, each unit tested. Attempt #4 keeps logic out of UI components from the start (see [Test-driven development](design-decisions/test-driven-development.md)).
- **Infrastructure before features** (2025 prototype). Choosing PouchDB and CouchDB meant building an auth proxy first, and the work stalled there. Pick a stack whose sync and auth work out of the box, and prove them with a thin end-to-end slice before building features.

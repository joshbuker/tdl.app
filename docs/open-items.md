# Open items

Cross-cutting questions and follow-ups that don't belong to a single feature spec. Per-feature questions live in each spec's "Open questions" section; list them with:

```sh
grep -rn -A12 "## Open questions" docs/features
```

Like the rest of `docs/`, this file is evergreen: remove an item once it's resolved or recorded elsewhere.

## Next steps

- Finish the remaining per-feature open questions. Most are on idea-stage features: soft dependencies, auto-scheduler, triage review and energy levels.
- Promote the core specs to Specified: link tasks, next up, create, complete and delete tasks, lists, and schedule.
- Choose a stack, recording the choice as a design decision (see "Stack constraints" below).

## Cross-cutting questions

- **Launch scope.** Web, Android, iOS and desktop, offline-first editing, list sharing across servers, MFA and natural-language entry are all planned for launch. Consider an MVP cut before choosing a stack. Federation and offline-first are the heaviest.
- **Post-launch items have no home.** Items such as natural-language parsing in languages other than English, or other import formats, are currently written as rules inside specs. Options: a `Planned` status, or a roadmap document.
- **Tags per shared list.** A shared list has its own tags, while a user's unshared lists use their own. Filtering by a tag across lists is undefined. Statuses avoid this with fixed categories (see [Statuses](features/organization/statuses.md)).
- **Board view.** Workflow lists suggest a kanban board with one column per status, but there's no spec for it yet. Swimlanes (rows grouped by e.g. assignee) could be part of it.
- **Energy levels** have no feature that uses them. Delete unless the auto-scheduler needs them.

## Design decisions to write

These choices from earlier attempts have written reasoning in `historical-versions/` and look worth keeping, but have no decision record yet:

- Server-side, revocable sessions.
- Error contract: 401 unauthenticated, 403 forbidden, 404 not found, with the trade-off that 403 reveals a record exists.
- Strict input validation, with no silent normalization.
- Translations from day one.
- Version pins must say when they can be lifted.
- Releases on version tags, with CI also run weekly to catch vulnerable dependencies.

## Stack constraints

Requirements gathered so far that the stack must support:

- One shared implementation of domain logic (graph rules, filtering and sorting, sync) running on both device and server.
- Offline sync with IDs generated on the device.
- A server-to-server protocol for sharing across servers (see [Federation](features/app/federation.md)).
- Web, Android, iOS and desktop.
- Good tooling for both unit and acceptance tests.

See also [Lessons from previous attempts](lessons-from-previous-attempts.md).

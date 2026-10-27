# Record design decisions

## Context

Attempt #3 kept its reasoning in `historical-versions/web.tdl.app/docs/` (`DESIGN_DECISIONS.md`, `VERSION_PINNING.md`, `CI_CD.md`), and that turned out to be valuable. Developers and AI agents both need the "why" written down, or they will undo constraints they can't see.

## Decision

Keep one evergreen record per decision in `docs/design-decisions/`, in the format described in that folder's README. Records are edited in place or deleted as decisions change, and Git holds the history.

## Alternatives considered

- **One growing file per topic** (attempt #3): gets unwieldy, and rejected alternatives tend not to be written down.
- **Commit messages / PR descriptions only**: not discoverable when reading the code.
- **Immutable numbered or dated records (classic ADRs)**: duplicates Git history, and readers must follow chains of superseded records to find what is currently true.

## Consequences

- A change that makes or changes a significant choice updates its record in the same change.
- `git log -p <record>` shows how a decision evolved.

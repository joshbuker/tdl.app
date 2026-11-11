# IDs, not titles

## Context

#1 and #2 enforced unique task titles, and earlier drafts of #4 kept list and tag titles unique per user. With sharing, titles from different people meet: a list shared with Bob can have the same title as one of his own, and uniqueness rules then need exceptions. Records already get IDs generated on the device for offline use (see [Offline first](offline-first.md)).

## Decision

Every record (task, list, tag, link and so on) is identified by its ID. Titles are labels and don't have to be unique.

Where a typed title matches several records (natural-language entry, pickers, search), the user picks from a menu. Each match shows its icon and color, and its owner if that isn't the user. The user's own records come first. Nothing is guessed.

## Alternatives considered

- **Unique titles per user** (#1, #2, earlier #4 drafts): titles can then stand in for records when typed, but shared records break it, and legitimate duplicates exist (the same chore in two projects).
- **The user's own record wins when typed**: quicker, but silently picks the wrong one when the user meant the shared one.

## Consequences

- Imports, exports and sync refer to records by ID, never by title.
- Filters by tag title (e.g. @Errands) still match every tag with that title, ignoring case (see [Tags](../features/organization/tags.md)).

# Deep links

Status: Proposed
Release: v1
Related: [IDs, not titles](../../design-decisions/ids-not-titles.md), [Sharing](sharing.md), [Platforms](platforms.md)

## Summary

Every task, list and saved preset has a link that opens it in the app, so it can be referenced from notes, calendars or other apps.

## Design intent

From earlier notes (TDL App Features): like Obsidian's links, any part of the app should be reachable from elsewhere, e.g. a task linked from a meeting note. Links use IDs, so they keep working after a rename (see [IDs, not titles](../../design-decisions/ids-not-titles.md)).

## Rules

- Every task, list and saved preset has a link that can be copied from it.
- A link is a web address on the user's server that opens the installed app when there is one, and the web app otherwise.
- Opening a link the user has no access to says only that it can't be opened, revealing nothing about what it points to (see [Sharing](sharing.md)).
- Opening a link to something in the Trash opens it in the Trash.
- Links work offline for anything already on the device.

## Scenarios

### Open a task from a link

- Given "alice" copied the link to "Paint fence"
- When she opens it from a note on her phone
- Then the app opens "Paint fence"

### Links survive renames

- Given "alice" copied the link to "Paint fence"
- When she renames the task to "Stain fence" and opens the link
- Then the app opens "Stain fence"

### No access reveals nothing

- Given "bob" has no access to "Paint fence"
- When he opens its link
- Then he is told it can't be opened, with no title or other details

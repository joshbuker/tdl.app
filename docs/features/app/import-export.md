# Import and export

Status: Proposed
Release: v1

## Summary

The user exports all their data to a file and imports it again.

## Design intent

Planned in Slipstream with its own file format (lists, tasks, links, dates, tags, notes). Never built. It also lets users leave or move between servers (see [Choose a server](../account/choose-server.md)).

## Rules

- Export produces a JSON file containing everything the user can see, decrypted on the device: tasks with all their fields (notes, subtasks, schedules, deadlines, priority, completion, assignment, reminders, recurrence), links, lists, tags, comments, history, settings, and which lists and tasks are shared with whom. Attachments are included as files alongside it.
- An export can be imported without loss.
- An import is validated before anything is changed. If any part is invalid, nothing is imported.
- Importing merges into the account: imported records are added with new IDs, never overwriting existing data, and links among imported tasks are preserved. Imported lists and tags are added as new ones, never matched to existing ones by name (see [IDs, not titles](../../design-decisions/ids-not-titles.md)). To start fresh, the user deletes their data first.
- Imported links that form a loop are kept and flagged, as with loops from sync (see [Offline use](offline.md)).
- Sharing is not imported: imported lists and tasks belong to the importing user and aren't shared.
- Imported data is encrypted on the device like any other change. (v2)

## Scenarios

### Round trip

- Given a user with tasks, links and lists
- When they export their data and import it into an empty account
- Then the new account has the same tasks, links and lists

### Invalid import

- When the user imports a file with a task that has no title
- Then nothing is imported and the problem is reported

### Import adds alongside existing data

- Given the user has a list "Home" with "Buy milk"
- When they import a file with a list "Home" containing "Paint fence"
- Then they have two lists called "Home", one with each task

## Open questions

- Which other formats (e.g. iCalendar VTODO, Todoist) in v2?

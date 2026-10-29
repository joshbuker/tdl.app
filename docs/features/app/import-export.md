# Import and export

Status: Proposed
Release: v1

## Summary

The user exports all their data to a file and imports it again.

## Design intent

Planned in Slipstream with its own file format (lists, tasks, links, dates, tags, notes). Never built. It also lets users leave or move between servers (see [Choose a server](../account/choose-server.md)).

## Rules

- Export produces a JSON file containing everything: tasks, links, lists, tags, statuses, schedules, deadlines, reminders, recurrence and settings.
- An export can be imported without loss.
- An import is validated before anything is changed. If any part is invalid, nothing is imported.
- Importing merges into the account: imported records are added with new IDs, never overwriting existing data, and links among imported tasks are preserved. Lists and tags whose names match existing ones (ignoring case) are reused. To start fresh, the user deletes their data first.

## Scenarios

### Round trip

- Given a user with tasks, links and lists
- When they export their data and import it into an empty account
- Then the new account has the same tasks, links and lists

### Invalid import

- When the user imports a file with a link that forms a cycle
- Then nothing is imported and the problem is reported

### Import merges

- Given the user has a list "Home" with "Buy milk"
- When they import a file with a list "home" containing "Paint fence"
- Then "Home" contains both "Buy milk" and "Paint fence"

## Open questions

- Which other formats (e.g. iCalendar VTODO, Todoist) in v2?

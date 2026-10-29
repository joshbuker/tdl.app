# Import and export

Status: Proposed

## Summary

The user exports all their data to a file and imports it again.

## Design intent

Planned in Slipstream with its own file format (lists, tasks, links, dates, tags, notes). Never built. It also lets users leave or move between servers (see [Choose a server](../account/choose-server.md)).

## Rules

- Export produces a JSON file containing everything: tasks, links, lists, tags, statuses, schedules, deadlines, reminders, recurrence and settings.
- An export can be imported without loss.
- An import is validated before anything is changed. If any part is invalid, nothing is imported.

## Scenarios

### Round trip

- Given a user with tasks, links and lists
- When they export their data and import it into an empty account
- Then the new account has the same tasks, links and lists

### Invalid import

- When the user imports a file with a link that forms a cycle
- Then nothing is imported and the problem is reported

## Open questions

- Importing into an account that already has data: merge, or replace?
- Other formats (e.g. iCalendar VTODO, Todoist) after launch?

# Current state and history

## Context

Sync stores every change as an operation and keeps it (see [Custom sync](custom-sync.md)), and task history shows every change, including overridden ones (see [Task history](../features/tasks/task-history.md)). The question is where removed records live. If a removed link stays among current links with a "removed" flag, every computation over links (next up, cycle and redundancy checks, loops, lookups) has to remember to filter it out, and a filter missed in one place is a bug.

## Decision

The server and every device keep two separate things:

- **Current state:** the records that exist now, with their current values. Everything that computes or checks reads only this: next up, the graph rules, access checks, filters, sorts, counts and views.
- **History:** every accepted operation, kept until its record is permanently deleted (see [Offline first](offline-first.md)). Task history, its "overridden" and "double completion" flags, undo, metrics such as cycle time, catching up devices, and the "couldn't sync" view are built from it.

Current state is always derived from history. A device recomputes it from the operations it holds, and the server updates its current-state tables in the same transaction that stores each operation.

- **Removing a record deletes it from current state.** This applies to records with no Trash, such as a link or a revoked grant. Its operations stay in history, so the change still shows in the history of the tasks it touched. Re-adding makes a new record.
- **Values computations need are fields in current state**, even when history could supply them: a record's creation time, a comment's edited time, or the status a completed task returns to.
- **The Trash is part of current state.** A trashed task still exists, with the time it was trashed, so it can be restored (see [Delete a task](../features/tasks/delete-task.md)). Views leave it out by reading that field.
- **Permanently deleting a record removes it from both,** current state and history.
- **Operations that arrive for a record no longer in current state** are refused as not found. This happens when, for example, an offline device edits a link someone else removed. The device shows them under "couldn't sync", so nothing typed is lost (see [Offline use](../features/app/offline.md)).

## Alternatives considered

- **Soft deletes** (a "removed" flag on the record): one table, but every query has to filter, and uniqueness rules (one link per pair, per direction) have to exclude removed rows.
- **History stored on each record**, e.g. a list of past values on the task: simpler to read, but splits the sync log across records, and loses changes to records that no longer exist.

## Consequences

- Uniqueness rules are plain unique indexes on current state.
- A record's history can outlive the record, so history views look records up by ID and have to cope with ones that are gone, showing what the history recorded about them.
- Access to history follows access to current state: someone who loses access to a task loses its history with it (see [Sharing](../features/app/sharing.md)).

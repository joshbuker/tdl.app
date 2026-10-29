# Task history

Status: Proposed
Release: v1
Related: [Statuses](../organization/statuses.md), [Offline use](../app/offline.md), [Recurring tasks](../scheduling/recurring-tasks.md), [Sharing](../app/sharing.md)

## Summary

Each task keeps a history of every change made to it: what changed, from what, to what, by whom, and when.

## Design intent

Workflow lists are for tracking who is doing what and when (see [Statuses](../organization/statuses.md)), and status changes over time are useful metrics. Offline sync and sharing mean several people and devices can change a task concurrently, so the history is also the record of what actually happened, including changes that were overridden or duplicated (see [Offline use](../app/offline.md)). The sync protocol already keeps the full change history, so the task history is a view of it, not a separate record.

## Rules

- Every change to a task is recorded: the field, the old and new values, who made it, on which device, and when.
- Changes to the task's links, subtasks and status are included.
- Changes that were overridden by a conflicting edit, or that duplicated another change, are kept and shown as such.
- Changes made concurrently on different devices or by different people are flagged (e.g. a double completion).
- Each completion of a recurring task is recorded (see [Recurring tasks](../scheduling/recurring-tasks.md)).
- Anyone who can view the task can see its history. History entries about tasks or links the user can't see are not shown (see [Sharing](../app/sharing.md)).
- History is never deleted while the task exists. Permanently deleting the task deletes its history.
- History feeds metrics such as time in each status and cycle time (v2). Where they are shown is decided then.

## Scenarios

### See who changed a task

- Given "bob" changes "Paint fence" from "To do" to "In progress"
- When "alice" opens the history of "Paint fence"
- Then they see the change, that "bob" made it, and when

### Double completion

- Given "alice" and "bob" both complete "Buy milk" while offline
- When both devices sync
- Then the history of "Buy milk" shows both completions, flagged as a double completion

### Overridden edit is kept

- Given one offline device renames "Paint fence" to "Paint the fence" and another renames it to "Stain fence"
- When the user resolves the conflict by keeping "Stain fence"
- Then the history shows both renames, with "Paint the fence" marked as overridden

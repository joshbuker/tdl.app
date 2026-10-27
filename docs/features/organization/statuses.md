# Statuses

Status: Proposed
Related: [Complete a task](../tasks/complete-task.md), [Delegation](delegation.md)

## Summary

Every task has a status from the user's set of statuses (e.g. To do, In progress, Waiting, Done). Completion is a status.

## Design intent

Added in #3 after the GTD rework was reverted, partly to cover "waiting for". #3 kept a separate completed flag alongside statuses, with "TODO" and "Done" as intended defaults, and never built a UI.

Here, completion is part of the status rather than a separate flag, so there's one place that describes where a task stands. Each status counts as either incomplete or complete, and that is what the rest of the app (next up, filters, the graph rules) uses.

## Rules

- Every task has exactly one status.
- Each status is either an incomplete status or a complete status.
- A task is completed when its status is a complete status.
- New users start with "To do" (incomplete) and "Done" (complete).
- New tasks get the user's default incomplete status.
- The user can add, rename, recolor, reorder and delete statuses. Titles are unique per user, ignoring case.
- A status in use cannot be deleted, and there is always at least one incomplete and one complete status.
- The time a task's status last changed is recorded.

## Scenarios

### Set a status

- Given the user has a status "In progress"
- When the user sets "Paint fence" to "In progress"
- Then "Paint fence" shows "In progress" and is still incomplete

### Completing sets a complete status

- When the user completes "Paint fence"
- Then its status is "Done"

## Open questions

- Can there be several complete statuses (e.g. "Done" and "Won't do")? If so, which one does the complete checkbox set?
- When a task is marked incomplete again, which status does it return to: its previous status, or the default?

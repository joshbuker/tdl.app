# Complete a task

Status: Proposed
Release: v1
Related: [Next up](../dependencies/next-up.md), [Statuses](../organization/statuses.md), [Soft dependencies](../dependencies/soft-dependencies.md), [Personalization](../app/personalization.md)

## Summary

The user marks a task complete, and can mark it incomplete again.

## Design intent

Completing a task is the most frequent action, so it should be one tap with immediate feedback. #3 played a sound and had an Undo toast (written but later orphaned).

## Rules

- Completing a task sets its status to the default complete status (see [Statuses](../organization/statuses.md)). Marking it incomplete returns it to the incomplete status it had before.
- A completed task can be marked incomplete again.
- After completing a task, a notice offers Undo, which marks it incomplete again. The notice stays on screen for the user's notification duration (see [Personalization](../app/personalization.md)).
- Completing a task cancels its pending reminders.
- Completing a task may unblock its postrequisites. Marking it incomplete blocks them again.
- The completion time is recorded.
- Completed tasks are hidden by default, and kept as history rather than deleted. They can be shown with a filter.
- A task with incomplete hard prerequisites can still be completed, because plans change and a prerequisite can turn out to be unnecessary. The user is warned first, and can complete or unlink those prerequisites at the same time. Incomplete soft prerequisites give no warning (see [Soft dependencies](../dependencies/soft-dependencies.md)).

## Scenarios

### Complete a task

- Given an incomplete task "Buy milk"
- When the user completes it
- Then "Buy milk" is no longer shown as next up

### Undo completion

- When the user completes "Buy milk" and chooses Undo
- Then "Buy milk" is incomplete again

### Complete a blocked task

- Given "A" is an incomplete prerequisite of "B"
- When the user completes "B"
- Then the user is warned that "A" is not done
- And can choose to complete "B" anyway

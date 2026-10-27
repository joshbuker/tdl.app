# Complete a task

Status: Proposed
Related: [Next up](../dependencies/next-up.md), [Statuses](../organization/statuses.md)

## Summary

The user marks a task complete, and can mark it incomplete again.

## Design intent

Completing a task is the most frequent action, so it should be one tap with immediate feedback. #3 played a sound and had an Undo toast (written but later orphaned).

## Rules

- Completing a task sets its status to a complete status (see [Statuses](../organization/statuses.md)). Marking it incomplete sets an incomplete status.
- A completed task can be marked incomplete again.
- Completing a task cancels its pending reminders.
- Completing a task may unblock its postrequisites. Marking it incomplete blocks them again.
- The completion time is recorded.
- Completed tasks are hidden by default, and kept as history rather than deleted. They can be shown with a filter.
- A task with incomplete prerequisites can still be completed, because plans change and a prerequisite can turn out to be unnecessary. The user is warned first, and can complete or unlink those prerequisites at the same time.

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

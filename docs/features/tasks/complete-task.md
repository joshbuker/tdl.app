# Complete a task

Status: Proposed
Release: v1
Related: [Next up](../dependencies/next-up.md), [Completion before statuses](../../design-decisions/completion-before-statuses.md), [Soft dependencies](../dependencies/soft-dependencies.md), [Personalization](../app/personalization.md)

## Summary

The user marks a task complete, and can mark it incomplete again.

## Design intent

Completing a task is the most frequent action, so it should be one tap with immediate feedback. #3 played a sound and had an Undo toast (written but later orphaned).

## Rules

- A task is either complete or incomplete (see [Completion before statuses](../../design-decisions/completion-before-statuses.md)). A completed task can be marked incomplete again.
- After completing a task, a notice offers Undo, which reverts the whole action: the task is marked incomplete again, and any prerequisites completed or unlinked with it are reverted too. The notice stays on screen for the user's notification duration (see [Personalization](../app/personalization.md)).
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

### Mark a task incomplete again

- Given "Paint fence" is completed
- When the user marks it incomplete
- Then "Paint fence" is incomplete and next up again

### Completing cancels reminders

- Given "Call plumber" has a reminder for tomorrow at 09:00
- When the user completes "Call plumber"
- Then no reminder is sent for it

### Completed tasks are hidden but kept

- Given the user completed "Buy milk"
- Then "Buy milk" is not shown by default
- And it is shown, with its completion time, when the user filters for completed tasks

### Complete prerequisites at the same time

- Given "A" is an incomplete prerequisite of "B"
- When the user completes "B" and, when warned, chooses to complete "A" too
- Then "A" and "B" are both completed

### Soft prerequisites give no warning

- Given "A" is an incomplete soft prerequisite of "B"
- When the user completes "B"
- Then "B" is completed without a warning

### Undo reverts prerequisites completed with it

- Given "A" is an incomplete prerequisite of "B"
- When the user completes "B", chooses to complete "A" too, and then chooses Undo
- Then "A" and "B" are both incomplete again

# Edit a task

Status: Proposed
Related: [Link tasks](../dependencies/link-tasks.md)

## Summary

The user opens a task to see and change its details: title, notes, list, dates, and links.

## Design intent

The task detail view is where most editing happens, so it needs to show the task's place in the graph (its prerequisites and postrequisites) and allow moving between linked tasks without closing it. #3 saved notes automatically after a pause in typing, and #1 saved each field as it changed.

## Rules

- Changes are saved without a separate Save step.
- Moving a task to another list only works for lists the user owns.
- Linked tasks are shown, and choosing one opens it in place.

## Scenarios

### Rename a task

- Given a task "Buy milk"
- When the user changes its title to "Buy oat milk"
- Then the task is shown as "Buy oat milk" everywhere

### Edit notes

- When the user types notes on a task and pauses
- Then the notes are saved

### Navigate to a linked task

- Given "A" is a prerequisite of "B" and "B" is open
- When the user chooses "A" from the prerequisites
- Then "A" is shown

## Open questions

- Which date fields are editable here? See [Schedule](../scheduling/schedule.md) and [Deadlines](../scheduling/deadlines.md).

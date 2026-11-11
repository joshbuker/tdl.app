# Undo

Status: Proposed
Release: v1
Related: [Complete a task](complete-task.md), [Delete a task](delete-task.md), [Edit a task](edit-task.md), [Task history](task-history.md), [Personalization](../app/personalization.md)

## Summary

After any change, a notice offers Undo, which reverts that change.

## Design intent

Mistaps on a phone are easy, and changes save without a Save step, so every change should be easy to take back (from a Todoist task: "undo last action" for mobile misclicks). #3 had an Undo toast for completing, written but later orphaned. Sync already records every change with its previous value (see [Task history](task-history.md)), so undo reapplies the previous values rather than keeping a separate undo stack.

## Rules

- Every change the user makes (creating, editing, moving, linking, unlinking, scheduling, completing, deleting, and so on) shows a notice with Undo. The notice stays on screen for the user's notification duration (see [Personalization](../app/personalization.md)).
- Undo reverts everything that one action did, and nothing else. For example, completing a task together with its prerequisites is one action (see [Complete a task](complete-task.md)).
- Undo only reverts the user's own change. If someone else, or another of the user's devices, has since changed the same field, that newer change is kept, and the user is told which parts couldn't be undone.
- Undoing is itself a change: it is recorded in history and synced, and works offline.
- Undo follows the same rules as making the change by hand. For example, undoing an unlink that would now create a cycle the user can see is rejected with the usual explanation.
- A shortcut undoes the most recent change while its notice is showing (see [Keyboard shortcuts](../app/keyboard-shortcuts.md)).

## Scenarios

### Undo an edit

- When the user renames "Paint fence" to "Stain fence" and chooses Undo
- Then the task is called "Paint fence" again

### Undo a link

- When the user makes "Buy paint" a prerequisite of "Paint fence" and chooses Undo
- Then the tasks are not linked

### Newer changes are kept

- Given "alice" changed the deadline of "Paint fence"
- And "bob" then renamed it to "Stain fence"
- When "alice" undoes her deadline change
- Then the deadline goes back, and the title stays "Stain fence"

### Undo is recorded

- When the user changes the schedule of "Call plumber" and chooses Undo
- Then the task's history shows both the change and the undo

# Delete a task

Status: Specified
Release: v1
Related: [Link tasks](../dependencies/link-tasks.md), [Sharing](../app/sharing.md)

## Summary

The user deletes a task, which moves it to the Trash. Tasks in the Trash can be restored or permanently deleted.

## Design intent

#1 to #3 deleted permanently after a confirmation. Slipstream had a Trash, which is brought back so that mistakes are recoverable without having to confirm every delete.

## Rules

- Deleting a task moves it to the Trash without asking for confirmation. A notice offers Undo, which restores it, and stays on screen for the user's notification duration (see [Personalization](../app/personalization.md)).
- Trashed tasks are hidden from every view, count and search, except the Trash itself.
- A trashed task does not block its postrequisites.
- A trashed task's links are kept, so restoring it restores its place in the graph. They count in the cycle check like any other link, so restoring a task can never create a cycle.
- Restoring a task puts it back as it was, including its links.
- Being in the Trash is a shared state of the task, not a place it moves to. A trashed task is in the Trash for everyone who can see it, and anyone who could delete it can restore it or permanently delete it (see [Sharing](../app/sharing.md)).
- Items in the Trash are permanently deleted 30 days after being trashed. The user can also empty the Trash at any time, which permanently deletes only the items they trashed themselves.
- Permanently deleting a task removes its links. Doing it by hand (from the Trash, or by emptying the Trash) asks for confirmation first. Linked tasks remain and are not reconnected to each other, so deleting a middle task unblocks what came after it.

## Scenarios

### Delete a task

- Given a task "Buy milk"
- When the user deletes it
- Then no confirmation is asked
- And "Buy milk" is no longer shown in any view
- And it is in the Trash

### Undo a delete

- When the user deletes "Buy milk" and chooses Undo
- Then "Buy milk" is back where it was, and not in the Trash

### Trashed task doesn't block

- Given "A" before "B"
- When the user deletes "A"
- Then "B" is next up

### Restore a task

- Given "A" before "B", and "A" is in the Trash
- When the user restores "A"
- Then "A" is a prerequisite of "B" again

### Empty the Trash

- Given "A" before "B" before "C", and "B" is in the Trash
- When the user empties the Trash and confirms
- Then "B" no longer exists
- And "A" and "C" still exist and are not linked to each other

### Trash empties after 30 days

- Given "Buy milk" was trashed 30 days ago
- Then "Buy milk" no longer exists

### Trashed tasks don't appear in search

- Given "Buy milk" is in the Trash
- When the user searches for "milk"
- Then "Buy milk" is not found

### Permanently delete one task

- Given "Buy milk" is in the Trash
- When the user permanently deletes it from the Trash
- Then they are asked to confirm
- And after confirming, "Buy milk" no longer exists

### Trash is shared

- Given "bob" is an editor and "carol" a viewer of the shared list "House"
- When "alice" deletes "Paint fence"
- Then "Paint fence" is in the Trash for "bob" and "carol"
- And "bob" can restore it, and "carol" can't

### Emptying only removes your own trashed items

- Given "alice" and "bob" are editors of "House"
- And "alice" trashed "Paint fence", and "bob" trashed "Fix roof"
- When "bob" empties the Trash and confirms
- Then "Fix roof" no longer exists
- And "Paint fence" is still in the Trash

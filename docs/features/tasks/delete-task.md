# Delete a task

Status: Proposed
Related: [Link tasks](../dependencies/link-tasks.md)

## Summary

The user deletes a task, which moves it to the Trash. Tasks in the Trash can be restored or permanently deleted.

## Design intent

#1 to #3 deleted permanently after a confirmation. Slipstream had a Trash, which is brought back so that mistakes are recoverable without having to confirm every delete.

## Rules

- Deleting a task moves it to the Trash without asking for confirmation.
- Trashed tasks are hidden from every view, count and search, except the Trash itself.
- A trashed task does not block its postrequisites.
- A trashed task's links are kept, so restoring it restores its place in the graph. They count in the cycle check like any other link, so restoring a task can never create a cycle.
- Restoring a task puts it back as it was, including its links.
- Permanently deleting a task (from the Trash, or by emptying the Trash) asks for confirmation and removes its links. Linked tasks remain and are not reconnected to each other, so deleting a middle task unblocks what came after it.

## Scenarios

### Delete a task

- Given a task "Buy milk"
- When the user deletes it
- Then "Buy milk" is no longer shown in any view
- And it is in the Trash

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

## Open questions

- Should the Trash empty itself automatically after some time?

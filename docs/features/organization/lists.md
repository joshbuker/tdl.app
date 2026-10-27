# Lists

Status: Proposed
Related: [Create a task](../tasks/create-task.md)

## Summary

Each task belongs to one list. The user creates, renames, colors, reorders and deletes lists.

## Design intent

Lists were in every attempt as the folder-style grouping, with Inbox as the catch-all. Seed data across attempts suggests GTD-style use (Inbox, Errands, At Home, Waiting).

## Rules

- Every task belongs to exactly one list.
- Each user has a default list, "Inbox", where new tasks go when no list is given. It is what the Inbox preset shows.
- List titles are required and unique per user, ignoring case.
- A list has a color. If none is chosen, a random one is assigned. Text on a colored background is black or white, whichever contrasts better.
- Colors are hex codes (`#abc` or `#aabbcc`).
- A list has an icon, chosen from a predefined set. There is a default icon.
- Lists can be reordered.
- Each list shows its count of next-up tasks.
- The default list cannot be deleted.
- Deleting a list moves it and all its tasks to the Trash (see [Delete a task](../tasks/delete-task.md)). Restoring the list restores its tasks. Restoring one of its tasks also restores the list.

## Scenarios

### Create a list

- When the user creates a list "Groceries"
- Then "Groceries" appears among their lists

### Duplicate list title

- Given a list "Groceries"
- When the user creates a list "groceries"
- Then it is rejected because the title is taken

### Filter by list

- Given "Buy milk" is in "Groceries" and "Paint fence" is in "Home"
- When the user selects "Groceries"
- Then "Buy milk" is shown and "Paint fence" is not

### Delete a list with tasks

- Given a list "Groceries" with the task "Buy milk"
- When the user deletes "Groceries"
- Then "Groceries" and "Buy milk" are in the Trash

### Cannot delete the default list

- When the user tries to delete their default list
- Then it is not deleted and the user is told why

## Open questions

- Which icon set?

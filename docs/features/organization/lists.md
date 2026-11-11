# Lists

Status: Proposed
Release: v1
Related: [Create a task](../tasks/create-task.md), [Sharing](../app/sharing.md), [IDs, not titles](../../design-decisions/ids-not-titles.md)

## Summary

Each task belongs to one list. The user creates, renames, colors, reorders and deletes lists.

## Design intent

Lists were in every attempt as the folder-style grouping, with Inbox as the catch-all. Seed data across attempts suggests GTD-style use (Inbox, Errands, At Home, Waiting).

## Rules

- Every task belongs to exactly one list.
- Each user has a default list, where new tasks go when no list is given. A list called "Inbox" is created at sign-up and is the default to start with. The user can make any list they own the default, and the Inbox preset shows whichever list is the default.
- List titles are required, and don't have to be unique (see [IDs, not titles](../../design-decisions/ids-not-titles.md)). A list can be renamed. A list shared with the user shows its owner's name.
- A shared list's title, color and icon are the same for everyone with access, and the owner and editors can change them (see [Sharing](../app/sharing.md)).
- A list has a color. If none is chosen, a random one is assigned. Text on a colored background is black or white, whichever contrasts better.
- Colors are hex codes (`#abc` or `#aabbcc`).
- A list has an icon, chosen from a predefined set. There is a default icon. The set is chosen with the stack (see [Open items](../../open-items.md)).
- Lists can be reordered. Each user orders their own lists, including lists shared with them.
- Each list shows its count of next-up tasks.
- The user's current default list cannot be deleted.
- Deleting a list moves it and all its tasks to the Trash (see [Delete a task](../tasks/delete-task.md)). Restoring the list restores its tasks. Restoring one of its tasks also restores the list, so only someone who can restore the list (its owner) can restore tasks from a trashed list.

## Scenarios

### Create a list

- When the user creates a list "Groceries"
- Then "Groceries" appears among their lists

### Duplicate list titles are allowed

- Given a list "Groceries"
- When the user creates another list "Groceries"
- Then they have two lists called "Groceries"

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

### Rename a list

- Given lists "Groceries" and "Home"
- When the user renames "Groceries" to "Shopping"
- Then the list is called "Shopping" and keeps its tasks

### Random color by default

- When the user creates a list without choosing a color
- Then the list has a color

### Color must be a hex code

- When the user sets a list's color to "red"
- Then it is rejected because colors are hex codes

### Reorder lists

- Given lists "Groceries" then "Home"
- When the user moves "Home" above "Groceries"
- Then "Home" is shown first

### List shows its next-up count

- Given "Home" has "A" before "B", both incomplete
- Then "Home" shows a count of 1

### Restoring a task restores its list

- Given "Groceries" and its task "Buy milk" are in the Trash
- When the user restores "Buy milk"
- Then "Groceries" is restored with "Buy milk" in it

### Choose a different default list

- Given lists "Inbox" and "Work"
- When the user makes "Work" their default list
- Then new tasks with no list go into "Work"
- And "Inbox" can be deleted

### Shared list with the same title

- Given "bob" has a list "Groceries"
- When "alice" shares her list "Groceries" with him
- Then "bob" sees both lists, with "alice" shown next to hers

### Pick between lists with the same title

- Given "bob" has a list "Groceries", and "alice" shared her "Groceries" with him
- When he types "#Groceries" in a new task's title
- Then he is offered both lists to choose from, his own first, with "alice" shown next to hers

### Order is per user

- Given "alice" shares "House" with "bob"
- When "bob" moves "House" to the top of his lists
- Then "alice"'s order of lists is unchanged

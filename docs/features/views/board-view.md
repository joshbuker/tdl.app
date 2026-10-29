# Board view

Status: Proposed
Release: v1
Related: [Statuses](../organization/statuses.md), [Filtering and sorting](filtering-and-sorting.md), [Lists](../organization/lists.md)

## Summary

A kanban board of the tasks for the current filter and sort, with one column per status. Moving a card to another column changes its status.

## Design intent

Workflow lists exist for Jira-style tracking (see [Statuses](../organization/statuses.md)), and a board is the usual way to see and move work through a workflow. Like every page, it is a presentation of the same filtered tasks, not a separate data set. Todoist's board layout is the main inspiration. No earlier attempt had a board.

## Rules

- When the tasks shown are from one list, there is one column per status of that list, in the list's status order.
- When the tasks shown span several lists, there is one column per status category (To do, In progress, Done), since each list has its own statuses. Each card shows its list as a chip, like tasks on every other page (see [Filtering and sorting](filtering-and-sorting.md)). Lists are not split into rows (swimlanes).
- Within a column, cards follow the current sort.
- Moving a card to another column sets the task's status. In a category column, it gets its list's default status for that category, or the first status in that category if there's no default.
- Moving a card follows the same rules as setting the status anywhere else, including the warning for completing a task with incomplete prerequisites (see [Complete a task](../tasks/complete-task.md)).
- A simple list can be shown as a board too. Its columns are its statuses (by default To do and Done).
- Columns for complete statuses follow the "show completed" filter.

## Scenarios

### Columns are the list's statuses

- Given the list "Work" has statuses "Backlog", "In review" and "Shipped"
- When the user shows "Work" on the Board page
- Then there are three columns: "Backlog", "In review" and "Shipped"

### Board across lists

- Given tasks from "Home" and "Work" are shown
- When the user selects the Board page
- Then the columns are To do, In progress and Done
- And each card shows whether it is in "Home" or "Work"

### Move a card

- Given "Fix bug" is "Backlog" in "Work"
- When the user moves its card to "In review"
- Then "Fix bug" is "In review"

# Statuses

Status: Proposed
Release: v1
Related: [Complete a task](../tasks/complete-task.md), [Assignment](assignment.md), [Lists](lists.md), [Board view](../views/board-view.md)

## Summary

Every task has a status (e.g. To do, In progress, Waiting, Done), and completion is a status. Each list has its own statuses, and chooses how tasks are shown: as a simple checkbox, or as a workflow with a full status picker.

## Design intent

The app serves two quite different uses. One is a simple todo list, like Todoist, where a checkbox marks a task done. The other is a Jira-style workflow, with several statuses and more detail about who is doing what and when. Each list picks the style that fits, the way Todoist lets each project choose between a checklist and a board.

Different projects need different workflows, so statuses belong to the list rather than the user, as in Jira and most kanban trackers, where each board's columns are its statuses. To still compare tasks across lists, each status belongs to one of a few fixed categories, as in Jira's To Do, In Progress and Done.

Statuses were added in #3 after the GTD rework was reverted, partly to cover "waiting for". #3 kept a separate completed flag on tasks alongside statuses, and gave each status its own completed flag. It used "TODO" and "Done" as the intended defaults, kept statuses per user, and never built a UI.

Here, completion is part of the status, not a separate flag, so one field says where a task stands. Each status's category says whether it counts as complete, and that is what the rest of the app (next up, filters, the graph rules) uses. Simple and workflow lists share this model, so a list can switch between them in either direction without converting or losing anything.

## Rules

- Each list has its own set of statuses. A new list starts with a copy of the user's default set, which the user edits in settings. New users' default set is "To do" (default incomplete) and "Done" (default complete).
- Changing the default set doesn't change existing lists.
- Every task has exactly one status, from its list's set.
- Each status belongs to one fixed category: To do, In progress or Done. These categories are the same for every list and user. Statuses like "Won't do" go in Done, and "Waiting" goes in To do or In progress as the list prefers.
- A status in the Done category is a complete status, and the others are incomplete statuses. A task is completed when its status is a complete status.
- Filters across lists select statuses by category (see [Filtering and sorting](../views/filtering-and-sorting.md)).
- There can be several complete statuses (e.g. "Done" and "Won't do"). One complete status is the default, and it is what the checkbox sets.
- One incomplete status is the default. New tasks get it.
- When a completed task is marked incomplete, it returns to the incomplete status it had before. If that status no longer exists, it gets the default incomplete status.
- The user can add, rename, recolor, reorder and delete a list's statuses. Titles are unique within the list, ignoring case.
- A status in use cannot be deleted, and a list always has at least one incomplete and one complete status.
- Each list is either a simple list or a workflow list (see [Lists](lists.md)):
  - In a simple list, tasks show a checkbox. Checking it sets the default complete status, and unchecking it marks the task incomplete as above.
  - In a workflow list, tasks show their status and can be set to any of the list's statuses. The checkbox is still available as a shortcut.
  - Switching a list between simple and workflow keeps its statuses and every task's status. A simple list only hides them.
- Moving a task to another list keeps a status with the same title in the new list, ignoring case. Otherwise the task gets the new list's default status for whether it is complete or incomplete.
- Every status change is recorded in the task's history: from which status, to which, by whom, and when. Changes made concurrently while offline are all kept, and flagged (see [Task history](../tasks/task-history.md)). This shows who is doing what and how long a task spent in each status.
- On a shared list, everyone with access uses the list's statuses (see [Sharing](../app/sharing.md)). The owner's default set only applied when the list was created.
- "Waiting" has no special meaning. A waiting task counts as next up like any other, and the user can filter it out (see [Assignment](assignment.md)).

## Scenarios

### Set a status

- Given "Paint fence" is in a workflow list with a status "In progress"
- When the user sets "Paint fence" to "In progress"
- Then "Paint fence" shows "In progress" and is still incomplete

### Completing sets the default complete status

- Given "Paint fence" is in a simple list
- When the user completes "Paint fence"
- Then its status is "Done"

### Another complete status

- Given "Paint fence" is in a list with a complete status "Won't do"
- When the user sets "Paint fence" to "Won't do"
- Then "Paint fence" is completed

### Reopen returns to the previous status

- Given "Paint fence" was "In progress" and was then completed
- When the user marks it incomplete
- Then its status is "In progress"

### Lists have their own statuses

- Given the list "Home" has statuses "To do" and "Done", and the list "Work" has "Backlog", "In review" and "Shipped"
- When the user sets a task in "Work" to a status
- Then the choices are "Backlog", "In review" and "Shipped"

### Switching to simple keeps statuses

- Given "Paint fence" is "In progress" in a workflow list
- When the list is switched to simple, then back to workflow
- Then "Paint fence" is still "In progress"

### Filter by category across lists

- Given "Paint fence" is "In progress" in "Home", and "Fix bug" is "In review" in "Work", both in the In progress category
- When the user filters all lists for the In progress category
- Then both tasks are shown

### Status changes are recorded

- When the user moves "Paint fence" from "To do" to "In progress"
- Then the task's history shows the change, who made it, and when

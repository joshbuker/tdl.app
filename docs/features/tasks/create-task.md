# Create a task

Status: Proposed
Related: [Search tasks](search-tasks.md), [Natural-language entry](natural-language-entry.md), [Lists](../organization/lists.md)

## Summary

The user creates a task by giving it a title, and optionally notes and a list.

## Design intent

Capture should be fast and low-friction, so details can be filled in later. Every attempt checked for possible duplicates as the title was typed (Slipstream: "Ensure new task is not dupe"), so the user can open an existing task instead of creating a second copy.

Titles don't have to be unique. #1 and #2 enforced unique titles, but legitimate duplicates exist (the same chore in two projects, sliced tasks, recurring tasks). Showing possible matches while typing catches accidental duplicates without forbidding intended ones.

## Rules

- A title is required. Leading and trailing whitespace is stripped.
- If no list is given, the task goes into the user's default list.
- While the title is typed, matching existing tasks are shown, and choosing one opens it instead of creating a new task.
- Titles do not have to be unique.
- New tasks are incomplete.
- After creating a task, the create dialog either stays open and cleared for the next task, or closes, depending on the user's setting. The default is to stay open.

## Scenarios

### Create a task with a title

- When the user creates a task titled "Buy milk"
- Then "Buy milk" appears in their default list

### Create a task in the selected list

- Given the user is viewing the list "Groceries"
- When the user creates a task titled "Buy milk"
- Then "Buy milk" is in "Groceries"

### Open a possible duplicate instead

- Given a task "Buy milk" exists
- When the user starts creating a task and types "milk"
- Then "Buy milk" is suggested
- And choosing it opens "Buy milk" without creating a new task

### Duplicate titles are allowed

- Given a task "Call mom" exists
- When the user creates another task titled "Call mom" without choosing the suggestion
- Then there are two tasks titled "Call mom"

### Rapid entry

- Given the setting to keep the create dialog open is on
- When the user creates "Buy milk"
- Then the dialog stays open with an empty title, ready for the next task

### Title is required

- When the user tries to create a task with a blank title
- Then no task is created and the user is told a title is required

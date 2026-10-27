# Subtasks

Status: Proposed
Related: [Link tasks](../dependencies/link-tasks.md)

## Summary

A task can have a simple checklist of subtasks.

## Design intent

From #3's schema: "Simple bullet list for a next action. Anything more complicated should be broken down as project(s)/next action(s)." Subtasks are a lightweight checklist, not a second hierarchy competing with dependencies. #3 had the data model but no working UI.

## Rules

- Subtasks have a title, an order and a completed flag.
- Subtasks cannot have links, dates or subtasks of their own.
- A subtask can be converted into a real task. The new task becomes a prerequisite of the original, and the subtask is removed.

## Scenarios

### Check off a subtask

- Given "Pack for trip" has subtasks "Toothbrush" and "Charger"
- When the user checks "Toothbrush"
- Then "Toothbrush" is checked and "Pack for trip" is still incomplete

### Convert a subtask to a task

- Given "Pack for trip" has a subtask "Buy adapter"
- When the user converts "Buy adapter" into a task
- Then "Buy adapter" is a task and a prerequisite of "Pack for trip"
- And it is no longer a subtask

## Open questions

- Does the new task inherit the original's list and tags?

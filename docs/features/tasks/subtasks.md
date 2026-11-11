# Subtasks

Status: Proposed
Release: v1
Related: [Link tasks](../dependencies/link-tasks.md)

## Summary

A task can have a simple checklist of subtasks.

## Design intent

From #3's schema: "Simple bullet list for a next action. Anything more complicated should be broken down as project(s)/next action(s)." Subtasks are a lightweight checklist, not a second hierarchy competing with dependencies. #3 had the data model but no working UI.

## Rules

- Subtasks are records of their own, each with a title, an order and a completed flag, so edits to different subtasks made at the same time on different devices are all kept. #3 also stored them as records.
- Subtasks cannot have links, dates or subtasks of their own.
- A subtask can be converted into a real task. The new task's form is prefilled with the subtask's title and the original task's details (list, tags, dates and so on), which the user can edit before saving. On save, the new task becomes a prerequisite of the original, and the subtask is removed. The original's history still shows the subtask and its conversion.

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

### Reorder subtasks

- Given "Pack for trip" has subtasks "Toothbrush" then "Charger"
- When the user moves "Charger" above "Toothbrush"
- Then the subtasks show "Charger" first

### Subtasks have no links, dates or subtasks

- Given "Pack for trip" has a subtask "Toothbrush"
- Then "Toothbrush" can't be given a date, a link or a subtask of its own

### Converted subtask is prefilled

- Given "Pack for trip" is in "Travel", tagged @Errands, with a subtask "Buy adapter"
- When the user converts "Buy adapter" into a task
- Then the new task's form shows the title "Buy adapter", the list "Travel" and the tag @Errands, and can be edited before saving

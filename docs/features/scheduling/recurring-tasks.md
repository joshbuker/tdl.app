# Recurring tasks

Status: Proposed
Release: v1
Related: [Schedule](schedule.md), [Subtasks](../tasks/subtasks.md), [Statuses](../organization/statuses.md)

## Summary

A task can repeat, Todoist style. When completed, it comes back at its next occurrence with its subtasks unchecked.

## Design intent

Never built, but planned repeatedly. #3 had pending tests: "should allow setting a recurring task with NLP", "should properly increment a recurring task marked complete", and setting recurrence from the title or due date, at a specific time of day. Slipstream planned "permanent loops": cyclic chains (A, B, C, D, then A again) where completing one flags the next.

#3 also had routines: named sets of tasks the user could reset together. Merging routines, recurring tasks and permanent loops into one feature was explored and found too complicated. A recurring task with a checklist of [Subtasks](../tasks/subtasks.md) covers the common case (e.g. doing laundry), so routines and loops are not planned.

## Rules

- A task can recur on a fixed schedule ("every Monday at 9", "the 1st of every month") or at an interval after completion ("2 weeks after I finish it").
- Completing a recurring task brings the same task back at its next occurrence: it gets the default incomplete status, its schedule moves to the next occurrence, and all its subtasks are unchecked.
- Recurring tasks stay outside the dependency graph: a recurring task can't have prerequisites or postrequisites (see [Link tasks](../dependencies/link-tasks.md)). Adding a recurrence to a linked task is rejected, with an explanation, until its links are removed.
- Relative reminders move to each new occurrence (see [Reminders](reminders.md)).
- Each completion is recorded in the task's history (see [Task history](../tasks/task-history.md)).
- Recurrence can be typed in natural language, in a new task's title or in a date field, as well as set with a picker (see [Natural-language entry](../tasks/natural-language-entry.md)).

## Scenarios

### Fixed schedule

- Given "Take out trash" recurs every Monday
- When the user completes it on Monday
- Then it is scheduled for the following Monday

### Interval after completion

- Given "Get a haircut" recurs 4 weeks after completion
- When the user completes it on March 10
- Then it is scheduled for April 7

### Subtasks reset

- Given "Do laundry" recurs every Saturday, with subtasks "Wash" and "Fold"
- When the user checks both subtasks and completes "Do laundry"
- Then "Do laundry" is scheduled for the following Saturday, and "Wash" and "Fold" are unchecked

### Recurring tasks can't be linked

- Given "Take out trash" recurs every Monday
- When the user tries to make it a prerequisite of "Clean garage"
- Then the link is rejected with a message explaining that recurring tasks can't be linked

### Natural-language entry

- When the user creates a task titled "Water plants every Monday at 9am"
- Then the task is titled "Water plants" and recurs every Monday at 09:00

# List view

Status: Proposed
Release: v1
Related: [Filtering and sorting](filtering-and-sorting.md), [Next up](../dependencies/next-up.md)

## Summary

A plain list of tasks for the current filter and sort, with a checkbox to complete each, or a status picker in a workflow list.

## Design intent

The default view in every attempt. #3 showed each task's count of incomplete postrequisites as a priority hint, highlighted when unusually high.

## Rules

- Each row shows the title, whether it has notes, its list and tags, its schedule and deadline (including an implied deadline), its status (in a workflow list), and how many tasks it blocks. Each row has a checkbox to complete it (see [Statuses](../organization/statuses.md)).
- Completing from the list works without opening the task.

## Scenarios

### Complete from the list

- Given "Buy milk" is shown in the list
- When the user checks it
- Then "Buy milk" is completed

### Empty state

- Given no tasks match the current filter
- Then an empty message is shown

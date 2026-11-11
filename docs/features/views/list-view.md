# List view

Status: Proposed
Release: v1
Related: [Filtering and sorting](filtering-and-sorting.md), [Next up](../dependencies/next-up.md)

## Summary

A plain list of tasks for the current filter and sort, with a checkbox to complete each.

## Design intent

The default view in every attempt. #3 showed each task's count of incomplete postrequisites as a priority hint, highlighted when unusually high.

## Rules

- Each row shows the title, whether it has notes, its list and tags, its schedule and deadline (including an implied deadline), and how many tasks it blocks in total. Each row has a checkbox to complete it (see [Complete a task](../tasks/complete-task.md)).
- Completing from the list works without opening the task.

## Scenarios

### Complete from the list

- Given "Buy milk" is shown in the list
- When the user checks it
- Then "Buy milk" is completed

### Empty state

- Given no tasks match the current filter
- Then an empty message is shown

### Row details

- Given "Paint fence" has notes, is in "House", is tagged @Weekend, is scheduled for Saturday with a deadline on Sunday, and blocks 2 tasks in total
- Then its row shows that it has notes, "House", @Weekend, Saturday, Sunday and 2

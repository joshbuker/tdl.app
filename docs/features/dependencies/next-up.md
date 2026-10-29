# Next up

Status: Proposed
Release: v1
Related: [Link tasks](link-tasks.md), [List view](../views/list-view.md)

## Summary

The app identifies "next up" tasks: incomplete tasks with no incomplete prerequisites. These are the tasks the user can actually work on now.

## Design intent

Blocked work is noise when deciding what to do next. Every attempt used this set (#1 "next up", #3 "layer zero") as the default for main views and counts.

## Rules

- A task is next up when it is incomplete and every one of its hard prerequisites is completed (or it has none). Soft prerequisites don't block (see [Soft dependencies](soft-dependencies.md)).
- Completing a task can make its postrequisites next up. Marking it incomplete again blocks them again.
- Counts shown next to lists and filters count next-up tasks.

## Scenarios

### Unblocked task is next up

- Given an incomplete task with no prerequisites
- Then it is next up

### Blocked task is not next up

- Given "A" is a prerequisite of "B", both incomplete
- Then "A" is next up and "B" is not

### Completing a prerequisite unblocks

- Given "A" is a prerequisite of "B", both incomplete
- When the user completes "A"
- Then "B" is next up

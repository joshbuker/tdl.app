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
- Next up is worked out per user, from the tasks and links they can see. A prerequisite in a list the user has no access to doesn't block for them (see [Sharing](../app/sharing.md)).
- A prerequisite in the Trash doesn't block (see [Delete a task](../tasks/delete-task.md)).
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

### Soft prerequisites don't block

- Given "A" is a soft prerequisite of "B", both incomplete
- Then "A" and "B" are both next up

### Marking a prerequisite incomplete blocks again

- Given "A" is a completed prerequisite of "B", and "B" is next up
- When the user marks "A" incomplete
- Then "B" is not next up

### Counts show next-up tasks

- Given the list "Home" has "A" before "B", both incomplete, and a completed task "C"
- Then "Home" shows a count of 1

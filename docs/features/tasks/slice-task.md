# Slice a task

Status: Proposed
Related: [Link tasks](../dependencies/link-tasks.md)

## Summary

The user splits a large task into N sequential pieces.

## Design intent

Big tasks are easier to start when broken into chunks. #3 built this: slicing "Write report" into 3 gives "Write report (1/3)", then "(2/3)", then the original "Write report" as the last piece, linked in order.

## Rules

- N must be at least 2.
- The new pieces copy the original's list, notes, dates and other details.
- The pieces are linked in order, and the original becomes the last piece.
- The original's prerequisites come before the first piece.

## Scenarios

### Slice a task into three

- Given a task "Write report"
- When the user slices it into 3
- Then "Write report (1/3)" comes before "Write report (2/3)", which comes before "Write report"

## Open questions

- #3 also linked every slice to all of the original's prerequisites, creating redundant links. Should only the first slice get them?

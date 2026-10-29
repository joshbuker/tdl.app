# Slice a task

Status: Proposed
Release: v1
Related: [Link tasks](../dependencies/link-tasks.md)

## Summary

The user splits a large task into N sequential pieces.

## Design intent

Big tasks are easier to start when broken into chunks. #3 built this: slicing "Write report" into 3 gives "Write report (1/3)", then "(2/3)", then the original "Write report" as the last piece, linked in order.

## Rules

- N must be at least 2.
- The new pieces copy the original's list, notes, dates and other details.
- The pieces are linked in order, and the original becomes the last piece.
- Only the first piece gets the original's prerequisites, and the original (as the last piece) keeps its postrequisites. The chain already orders the other pieces, so this adds no redundant links. (#3 linked every piece to every prerequisite.)

## Scenarios

### Slice a task into three

- Given a task "Write report"
- When the user slices it into 3
- Then "Write report (1/3)" comes before "Write report (2/3)", which comes before "Write report"

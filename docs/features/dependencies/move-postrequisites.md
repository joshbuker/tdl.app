# Move postrequisites

Status: Proposed
Related: [Link tasks](link-tasks.md)

## Summary

From a task's postrequisites, the user can pick one and move all the other postrequisites under it.

## Design intent

When several tasks all wait on A, and one of them (the "MVP postrequisite") should really go first, re-linking each one by hand is slow. #3 built this as "Move all postreqs from current task to this task".

## Rules

- Given A with postrequisites B, C and D, choosing B gives A before B, and B before C and D.
- Only incomplete postrequisites are moved.
- If any move would break a rule from [Link tasks](link-tasks.md), nothing changes.

## Scenarios

### Move postrequisites under one of them

- Given "A" is a prerequisite of "B", "C" and "D"
- When the user moves the postrequisites of "A" under "B"
- Then "A" is a prerequisite of "B" only
- And "B" is a prerequisite of "C" and "D"

## Open questions

- Is the reverse (move prerequisites) useful too?

# Prune redundant links

Status: Proposed
Related: [Link tasks](link-tasks.md)

## Summary

The app shows which of a task's links are redundant (implied by other links), and the user can remove them all at once.

## Design intent

Links can become redundant over time, for example after inserting a task or after a completed task is marked incomplete again. #3 highlighted near and far redundant links and offered a "Prune" button. Pruning is user-initiated: it keeps the "mark, don't silently prune" direction from #2.

## Rules

- A link from A to C is redundant when another path from A to C exists through incomplete tasks.
- Redundant links are flagged in the task's list of links.
- Pruning removes only redundant links. What each task is blocked by doesn't change.

## Scenarios

### Prune a redundant prerequisite

- Given "A" before "B" before "C", and a direct link "A" before "C"
- When the user prunes the prerequisites of "C"
- Then "A" is no longer a direct prerequisite of "C"
- And "C" is still blocked by "B"

# Focus

Status: Proposed
Related: [Agenda](agenda.md), [Next up](../dependencies/next-up.md)

## Summary

Shows one task to do now, plus what's up next, with quick actions to complete, slice or add prerequisites.

## Design intent

Built in #3 to cut decision fatigue: instead of a list, show the single most important next-up task. "Up next" includes tasks that completing the current one would unblock.

## Rules

- The focused task is the next-up task with the most incomplete postrequisites.
- "Up next" is the best remaining next-up task, or a task that the focused task alone is blocking.

## Scenarios

### Show the most important task

- Given next-up tasks "A" blocking 3 tasks and "B" blocking 1
- Then "A" is in focus

### Complete and advance

- Given "A" is in focus
- When the user completes "A"
- Then the next most important task is in focus

## Open questions

- Should focus respect scheduled dates (only tasks for today)?

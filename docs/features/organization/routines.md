# Routines

Status: Proposed
Related: [Recurring tasks](../scheduling/recurring-tasks.md), [Link tasks](../dependencies/link-tasks.md)

## Summary

A routine is a named, reusable set of tasks (e.g. "Daily Routine") that the user can reset to start over.

## Design intent

Added in #3 (called procedures in the code, routines in the UI) for repeated checklists. Resetting marks every task in the routine incomplete again, so the routine can be run again.

## Rules

- Routine titles are unique per user, ignoring case.
- A task can be in several routines.
- Resetting a routine marks all its tasks incomplete.
- Resetting keeps links between tasks in the routine and removes links from routine tasks to tasks outside it. (#3 behavior.)

## Scenarios

### Reset a routine

- Given a routine "Morning" with completed tasks "Stretch" and "Make coffee"
- When the user resets "Morning"
- Then "Stretch" and "Make coffee" are incomplete

## Open questions

- How do routines relate to recurring tasks? Options are listed in [Recurring tasks](../scheduling/recurring-tasks.md).
- Why were outside links removed on reset? (#3 commit: "hotfix to remove postreqs that stop making sense after 24h".)
- Should tasks in a routine be shown in agenda order?

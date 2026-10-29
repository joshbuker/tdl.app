# Triage review

Status: Proposed
Release: v1
Related: [Schedule](schedule.md), [Assignment](../organization/assignment.md), [Link tasks](../dependencies/link-tasks.md)

## Summary

The user steps through a set of tasks one at a time, clarifying each with a GTD-style decision tree: is it actionable, is it more than one step, can it be done in two minutes, should it be delegated, or deferred?

## Design intent

Two earlier versions: #1's Review dialog stepped through Today with Now, Later (Tomorrow, Next week, Upcoming, Someday), Done and Delete. #3's GTD period had a "very hefty" clarify flow (Actionable? More than one action? Under two minutes? Delegate? Defer?). Both were partly finished.

The GTD decision tree is the chosen model, because it turns an unclear backlog into well-formed tasks rather than just postponing them. Each question maps to an existing feature (completion, links, assignment, schedule), so the review adds no new data, and GTD stays a workflow rather than the app's model (see [Dependency graph with dates](../../design-decisions/dependency-graph-with-dates.md)). To keep it from being hefty, each question is one tap and the user can stop at any point.

## Rules

- The review steps through tasks one at a time, and the user can stop at any point.
- For each task, the questions are asked in order, and each answer either finishes the task's review or moves to the next question:
  1. **Is it actionable?** If not: delete it, or keep it unscheduled for someday.
  2. **Is it more than one step?** If so: break it into tasks, linked as its prerequisites (see [Link tasks](../dependencies/link-tasks.md)).
  3. **Can it be done in under two minutes?** If so: do it now, then complete it.
  4. **Should someone else do it?** If so: assign it (see [Assignment](../organization/assignment.md)) and optionally set a waiting status and follow-up date.
  5. **Should it wait until later?** If so: schedule it (see [Schedule](schedule.md)).
  6. Otherwise it stays as a next-up task.
- The user can skip a task without answering.

## Scenarios

### Two-minute task

- Given "Reply to Sam" is being reviewed
- When the user answers that it is actionable, one step, and under two minutes
- Then the user is prompted to do it now, and can complete it

### Break into steps

- Given "Plan trip" is being reviewed
- When the user answers that it is more than one step and adds "Book flights" and "Book hotel"
- Then "Book flights" and "Book hotel" are prerequisites of "Plan trip"

### Delegate

- Given "Fix sink" is being reviewed
- When the user answers that someone else should do it and assigns "Plumber"
- Then "Fix sink" is assigned to "Plumber"

### Defer

- Given "Renew passport" is being reviewed
- When the user answers that it should wait and picks next month
- Then "Renew passport" is scheduled for next month

### Not actionable

- Given "Learn piano someday" is being reviewed
- When the user answers that it isn't actionable and chooses to delete it
- Then "Learn piano someday" is in the Trash

## Open questions

- Which tasks are reviewed: the Inbox, Today, the current filter, or everything due for review?
- How is "someday" represented: unscheduled, a "Someday" list or tag, or a status?

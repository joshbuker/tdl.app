# Delegation

Status: Proposed
Related: [Statuses](statuses.md), [Schedule](../scheduling/schedule.md), [Deadlines](../scheduling/deadlines.md), [Prioritize date](../scheduling/prioritize-date.md)

## Summary

A task can be marked as delegated to someone, usually with a "Waiting" status, and followed up on using its schedule or deadline.

## Design intent

"Waiting for someone else" was in every model: GTD's Waiting For in early #3, then a `delegated` flag in late #3. Here, waiting is just a status the user can create, plus a record of who the task is delegated to. Follow-ups reuse the task's existing dates rather than a separate follow-up date: the [Schedule](../scheduling/schedule.md) is when to check in, the [Deadline](../scheduling/deadlines.md) is the task's own deadline, and the [Prioritize date](../scheduling/prioritize-date.md) flags it when it's at risk of missing that deadline.

## Rules

- A task can record who it is delegated to: a collaborator on its list (see [Sharing](../app/sharing.md)), or free text for someone outside the app.
- Delegation doesn't require any particular status, but is typically paired with a "Waiting" status.
- Scheduling a delegated task sets when to follow up. Its deadline and prioritize date work as on any other task.
- Delegated and waiting tasks get no special treatment: they count as next up like any other task. A user who wants them out of the way filters them out (see [Filtering and sorting](../views/filtering-and-sorting.md)).

## Scenarios

### Delegate a task

- Given "Fix sink" is in a list with a "Waiting" status
- When the user sets "Fix sink" to "Waiting", delegated to "Plumber", scheduled for Friday
- Then "Fix sink" shows it is waiting on "Plumber" and appears in Today on Friday

# Delegation

Status: Proposed
Related: [Statuses](statuses.md), [Schedule](../scheduling/schedule.md), [Deadlines](../scheduling/deadlines.md)

## Summary

A task can be marked as delegated to someone, usually with a "Waiting" status, and followed up on using its schedule or deadline.

## Design intent

"Waiting for someone else" was in every model: GTD's Waiting For in early #3, then a `delegated` flag in late #3. Here, waiting is just a status the user can create, plus a record of who the task is delegated to. Follow-ups reuse the task's existing [Schedule](../scheduling/schedule.md) (when to check in) and [Deadline](../scheduling/deadlines.md) (when it's needed by), rather than a separate follow-up date.

## Rules

- A task can record who it is delegated to.
- Delegation doesn't require any particular status, but is typically paired with a "Waiting" status.
- Scheduling a delegated task sets when to follow up.

## Scenarios

### Delegate a task

- Given the user has a "Waiting" status
- When the user sets "Fix sink" to "Waiting", delegated to "Plumber", scheduled for Friday
- Then "Fix sink" shows it is waiting on "Plumber" and appears in Today on Friday

## Open questions

- Is "delegated to" free text, or chosen from a list of people (and later, other users, see [Sharing](../app/sharing.md))?
- Should tasks that are waiting on someone else count as next up?

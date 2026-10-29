# Assignment

Status: Proposed
Related: [Sharing](../app/sharing.md), [Statuses](statuses.md), [Schedule](../scheduling/schedule.md), [Deadlines](../scheduling/deadlines.md), [Prioritize date](../scheduling/prioritize-date.md)

## Summary

A task can be assigned to one person, who is responsible for completing it: a collaborator on its list, or someone outside the app. Other people helping with the task can be recorded as participants. Assigning a task to someone else is how the user delegates it.

## Design intent

"Waiting for someone else" was in every model: GTD's Waiting For in early #3, then a `delegated` flag in late #3, which recorded no person. Assigning tasks to collaborators was planned in #1's beta and in Slipstream (AssignedTo) but never built. Delegating and assigning are the same idea, so they share one field: who is responsible for the task.

One assignee keeps ownership clear, as in Jira and Todoist. Participants record who else is involved without blurring who is responsible.

Waiting is just a status a list can have (see [Statuses](statuses.md)). Follow-ups reuse the task's existing dates rather than a separate follow-up date: the [Schedule](../scheduling/schedule.md) is when to check in, the [Deadline](../scheduling/deadlines.md) is the task's own deadline, and the [Prioritize date](../scheduling/prioritize-date.md) flags it when it's at risk of missing that deadline.

## Rules

- A task has at most one assignee: the list's owner or one of its collaborators (see [Sharing](../app/sharing.md)), or free text for someone outside the app.
- A task can have any number of participants, chosen the same way as the assignee. The assignee is not also a participant.
- Each user can filter for tasks assigned to them, and by assignee or participant in general (see [Filtering and sorting](../views/filtering-and-sorting.md)).
- Assignment doesn't require any particular status. A delegated task is typically paired with a "Waiting" status.
- Scheduling a delegated task sets when to follow up. Its deadline and prioritize date work as on any other task.
- Assigned and waiting tasks get no special treatment: they count as next up like any other task. A user who wants them out of the way filters them out.
- When someone loses access to a list, they are no longer the assignee or a participant of its tasks.

## Scenarios

### Assign a task to a collaborator

- Given "bob" is an editor of "House"
- When "alice" assigns "Paint fence" to "bob"
- Then "Paint fence" shows up when "bob" filters for tasks assigned to him

### Delegate to someone outside the app

- Given "Fix sink" is in a list with a "Waiting" status
- When the user sets "Fix sink" to "Waiting", assigns it to "Plumber", and schedules it for Friday
- Then "Fix sink" shows it is waiting on "Plumber" and appears in Today on Friday

### Only one assignee

- Given "Paint fence" is assigned to "bob"
- When "alice" assigns it to "carol"
- Then "carol" is the assignee and "bob" is not

### Add a participant

- Given "Paint fence" is assigned to "bob"
- When "alice" adds "carol" as a participant
- Then "Paint fence" shows "bob" as assignee and "carol" as a participant

## Open questions

- When an assignee loses access to a list, should their tasks become unassigned, or keep their name as free text?
- Are free-text names remembered per list, so "Plumber" can be picked again and filtered on consistently?

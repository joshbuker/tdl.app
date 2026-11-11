# Assignment

Status: Proposed
Release: v1
Related: [Sharing](../app/sharing.md), [Schedule](../scheduling/schedule.md), [Deadlines](../scheduling/deadlines.md), [Prioritize date](../scheduling/prioritize-date.md)

## Summary

A task can be assigned to one person, who is responsible for completing it: anyone who can view it, or someone outside the app. Other people helping with the task can be recorded as participants. Assigning a task to someone else is how the user delegates it.

## Design intent

"Waiting for someone else" was in every model: GTD's Waiting For in early #3, then a `delegated` flag in late #3, which recorded no person. Assigning tasks to collaborators was planned in #1's beta and in Slipstream (AssignedTo) but never built. Delegating and assigning are the same idea, so they share one field: who is responsible for the task.

One assignee keeps ownership clear, as in Jira and Todoist. Participants record who else is involved without blurring who is responsible.

In GTD, "waiting for" always means waiting on a person, so an assignee covers it, and a context tag (e.g. @Waiting) can mark it too. Waiting on a task is being blocked by a prerequisite. Follow-ups reuse the task's existing dates rather than a separate follow-up date: the [Schedule](../scheduling/schedule.md) is when to check in, the [Deadline](../scheduling/deadlines.md) is the task's own deadline, and the [Prioritize date](../scheduling/prioritize-date.md) flags it when it's at risk of missing that deadline.

## Rules

- A task has at most one assignee: anyone with viewer access or above to the task, through its list or a direct grant (see [Sharing](../app/sharing.md)), or free text for someone outside the app.
- A task can have any number of participants, chosen the same way as the assignee. The assignee is not also a participant.
- Each user can filter for tasks assigned to them, and by assignee or participant in general (see [Filtering and sorting](../views/filtering-and-sorting.md)).
- Scheduling a delegated task sets when to follow up. Its deadline and prioritize date work as on any other task.
- Assigned and waiting tasks get no special treatment: they count as next up like any other task. A user who wants them out of the way filters them out.
- When someone loses access to a task (through its list or a direct grant, including by leaving it), their assignment or participation on it becomes free text with their name, so the record of who was responsible is kept and the task can be reassigned.
- Free-text names the user has entered before are suggested as they type, matched ignoring case, so the same outside person is picked and filtered on consistently. There is no separate contacts list to manage.

## Scenarios

### Assign a task to a collaborator

- Given "bob" is an editor of "House"
- When "alice" assigns "Paint fence" to "bob"
- Then "Paint fence" shows up when "bob" filters for tasks assigned to him

### Delegate to someone outside the app

- When the user assigns "Fix sink" to "Plumber", tags it @Waiting, and schedules it for Friday
- Then "Fix sink" shows it is assigned to "Plumber" and appears in Today on Friday

### Assign a task shared directly

- Given "alice" shared "Paint fence" with "bob" as a viewer, and he can't see its list
- When "alice" assigns "Paint fence" to "bob"
- Then "Paint fence" shows up when "bob" filters for tasks assigned to him

### Only one assignee

- Given "Paint fence" is assigned to "bob"
- When "alice" assigns it to "carol"
- Then "carol" is the assignee and "bob" is not

### Add a participant

- Given "Paint fence" is assigned to "bob"
- When "alice" adds "carol" as a participant
- Then "Paint fence" shows "bob" as assignee and "carol" as a participant

### Lost access keeps the name

- Given "Paint fence" in "House" is assigned to "bob"
- When "bob" loses access to "House"
- Then "Paint fence" is assigned to "bob" as free text

### Suggest a previous name

- Given the user has assigned a task to "Plumber" before
- When the user starts typing "plu" as an assignee
- Then "Plumber" is suggested

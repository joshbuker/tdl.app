# Link tasks

Status: Specified
Release: v1
Related: [Next up](next-up.md), [Delete a task](../tasks/delete-task.md), [Dependency graph with dates](../../design-decisions/dependency-graph-with-dates.md), [Soft dependencies](soft-dependencies.md)

## Summary

The user can mark one task as a prerequisite of another ("A must be done before B"), and remove that link.

## Design intent

Dependencies are the backbone of the app. They replace nested subtask hierarchies: a big piece of work is a set of tasks linked in order, not a parent with children. [Subtasks](../tasks/subtasks.md) are only a lightweight checklist inside one task. Every attempt (and Slipstream before them) used this model.

The rules keep the graph meaningful. A cycle would mean nothing can ever be started. A redundant shortcut link (A before C, when A before B before C already exists) adds clutter without adding information.

## Rules

- A link is one record between two tasks, with attributes: whether it is hard or soft (see [Soft dependencies](soft-dependencies.md)), and an optional reason describing why it exists. The reason is markdown of any length, like task notes (see [Edit a task](../tasks/edit-task.md)). Links are records of their own (see [Links are records](../../design-decisions/links-are-records.md)).
- A task cannot be linked to itself.
- A recurring task cannot be linked (see [Recurring tasks](../scheduling/recurring-tasks.md)).
- Adding or removing a link needs edit access to both tasks. The two tasks can be in different lists, owned by different users. Links to tasks other people can't see are invisible to them and don't block for them (see [Sharing](../app/sharing.md)).
- A link that already exists cannot be added again.
- A link that would create a cycle the user can see is rejected (B already comes before A, so A before B is rejected). The cycle check includes completed tasks, so marking a task incomplete can never create a cycle.
- A redundant link is rejected (A already comes before C through incomplete tasks, so a direct A before C is rejected). The redundancy check ignores completed tasks: a path through finished work no longer orders anything, so making the remaining ordering explicit is allowed.
- Rejections explain why, naming both tasks. The rules only consider tasks and links the user can see, so a rejection never reveals anything hidden (see [Sharing](../app/sharing.md)). A loop the user adding the link can't see, or one formed by changes made at the same time on different devices, is allowed and flagged instead (see [Sharing](../app/sharing.md) and [Offline use](../app/offline.md)).
- When a new link makes an existing link redundant, the existing link is kept and shown as redundant. It is never removed without the user asking. In v2, all of a task's redundant links can be removed at once (see [Prune redundant links](prune-redundant-links.md)).
- When searching for a task to link, tasks that can't be linked (itself, recurring, already linked, would create a cycle, would be redundant) are shown disabled, with the reason.
- When adding a prerequisite or postrequisite, typing a title that matches no task creates a new task in the same list and links it in one step. If the user can't add tasks to that list (e.g. the task was shared with them directly), the new task goes into their default list.
- Deleting a task keeps its links while it is in the Trash. Permanently deleting it removes them, and the tasks on the other side remain (see [Delete a task](../tasks/delete-task.md)).

## Scenarios

### Add a prerequisite

- Given tasks "Buy paint" and "Paint fence"
- When the user makes "Buy paint" a prerequisite of "Paint fence"
- Then "Buy paint" is listed as a prerequisite of "Paint fence"
- And "Paint fence" is listed as a postrequisite of "Buy paint"

### Give a link a reason

- Given "Buy paint" is a prerequisite of "Paint fence"
- When the user gives the link the reason "Need the right color first"
- Then the link shows that reason

### Reject a cycle

- Given "A" is a prerequisite of "B" and "B" is a prerequisite of "C"
- When the user makes "C" a prerequisite of "A"
- Then the link is rejected with a message explaining it would create a cycle

### Reject a redundant link

- Given "A" is a prerequisite of "B" and "B" is a prerequisite of "C", all incomplete
- When the user makes "A" a prerequisite of "C"
- Then the link is rejected with a message explaining "A" already comes before "C"

### Cycles through completed tasks are still rejected

- Given "A" before "B" before "C", and "B" is completed
- When the user makes "C" a prerequisite of "A"
- Then the link is rejected with a message explaining it would create a cycle

### Completed tasks don't make links redundant

- Given "A" before "B" before "C", and "B" is completed
- When the user makes "A" a prerequisite of "C"
- Then the link is added

### Remove a link

- Given "A" is a prerequisite of "B"
- When the user removes that link
- Then neither task lists the other

### Existing link that becomes redundant is kept

- Given "A" is a prerequisite of "C"
- When the user makes "A" a prerequisite of "B" and "B" a prerequisite of "C"
- Then "A" is still a prerequisite of "C"
- And that link is shown as redundant

### Invalid candidates are shown disabled

- Given "A" before "B"
- When the user searches for a prerequisite to add to "A"
- Then "B" is shown but can't be chosen, with the reason that it would create a cycle

### Create and link in one step

- Given a task "Paint fence"
- When the user adds a prerequisite by typing a title that matches no existing task, "Buy paint"
- Then a new task "Buy paint" is created and linked as a prerequisite of "Paint fence"

### Can't link a task to itself

- Given a task "A"
- When the user searches for a prerequisite to add to "A"
- Then "A" is shown but can't be chosen, with the reason that a task can't be linked to itself

### Recurring tasks can't be linked

- Given "Water plants" repeats every week
- When the user tries to make "Water plants" a prerequisite of "Repot plants"
- Then the link is rejected with a message explaining recurring tasks can't be linked

### Link already exists

- Given "A" is a prerequisite of "B"
- When the user searches for a prerequisite to add to "B"
- Then "A" is shown but can't be chosen, with the reason that it is already linked

### Both tasks must be editable

- Given "bob" is a viewer of alice's shared list "House", which contains "Paint fence"
- When he tries to make his own task "Buy paint" a prerequisite of "Paint fence", or "Paint fence" a prerequisite of "Buy paint"
- Then the link is rejected with a message explaining he can't edit "Paint fence"

### Private prerequisite on a shared task

- Given "bob" is an editor of alice's shared list "House", which contains "Paint fence"
- When he makes his own task "Buy paint" a prerequisite of "Paint fence"
- Then the link is added, and "Paint fence" is blocked for "bob"
- And "alice" doesn't see "Buy paint", and "Paint fence" is still next up for her

### Outline access can't be linked

- Given "bob" has outline access to "Get paid"
- When he searches for a prerequisite to add to his task "Buy paint"
- Then "Get paid" is not offered

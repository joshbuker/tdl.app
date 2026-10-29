# Link tasks

Status: Proposed
Release: v1
Related: [Next up](next-up.md), [Dependency graph with dates](../../design-decisions/dependency-graph-with-dates.md), [Soft dependencies](soft-dependencies.md)

## Summary

The user can mark one task as a prerequisite of another ("A must be done before B"), and remove that link.

## Design intent

Dependencies are the backbone of the app. They replace nested subtask hierarchies: a big piece of work is a set of tasks linked in order, not a parent with children. Every attempt (and Slipstream before them) used this model.

The rules keep the graph meaningful. A cycle would mean nothing can ever be started. A redundant shortcut link (A before C, when A before B before C already exists) adds clutter without adding information.

## Rules

- A link is one record between two tasks, with attributes: whether it is hard or soft (see [Soft dependencies](soft-dependencies.md)), and an optional reason describing why it exists. Links are records of their own (see [Links are records](../../design-decisions/links-are-records.md)).
- A task cannot be linked to itself.
- A recurring task cannot be linked (see [Recurring tasks](../scheduling/recurring-tasks.md)).
- The user must be able to edit both tasks. With [Sharing](../app/sharing.md), the two tasks can be in lists shared with different people.
- A link that already exists cannot be added again.
- A link that would create a cycle is rejected (B already comes before A, so A before B is rejected). The cycle check includes completed tasks, so marking a task incomplete can never create a cycle.
- A redundant link is rejected (A already comes before C through incomplete tasks, so a direct A before C is rejected). The redundancy check ignores completed tasks: a path through finished work no longer orders anything, so making the remaining ordering explicit is allowed.
- Rejections explain why, naming both tasks. The rules only consider tasks and links the user can see, so a rejection never reveals anything hidden (see [Sharing](../app/sharing.md)).
- When a new link makes an existing link redundant, the existing link is kept and shown as redundant. It is never removed without the user asking (see [Prune redundant links](prune-redundant-links.md)).
- When searching for a task to link, tasks that can't be linked (itself, recurring, already linked, would create a cycle, would be redundant) are shown disabled, with the reason.
- Deleting a task removes its links. The tasks on the other side remain.

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

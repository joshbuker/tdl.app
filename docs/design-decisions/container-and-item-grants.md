# Container and item grants

## Context

Earlier drafts allowed sharing only by list, like Todoist's shared projects. That kept permissions simple, but every case that didn't fit a whole list needed a special rule: links to tasks in lists a collaborator can't see, a shared list whose title clashes with one of the collaborator's own, per-list tags for shared lists, and whose Trash a shared task goes to. None of the earlier attempts had sharing. Slipstream planned a per-task "SharedTo" field, but never built it.

## Decision

Access is granted on **containers** (lists) and on **items** (single tasks), the model used by Google Drive, Notion and Dropbox:

- Sharing a list gives access to all of its tasks.
- A single task can also be shared directly with someone, whether or not they can see its list.
- Roles are owner, editor, commenter and viewer, plus outline in v2. Any of them except owner can be granted on a list or on a task. Outline shows that a task exists, how it links and whether it is complete, but nothing else, like free/busy in a shared calendar.
- A person's access to a task is the highest of what its list gives them and what the task gives them. Grants only add access: a task can't be hidden from someone who can see its list.
- Tags are shared the same way, on their own: a tag shows on a task only to people with access to both, and sharing a task asks which of its tags to share (see [Tags](../features/organization/tags.md)).
- Trash is a shared state on the record, not a place it moves to (see [Delete a task](../features/tasks/delete-task.md)).

Permissions are worked out by following these relationships (person to list, person to task, task to list), as in Google's Zanzibar and its open-source descendants (SpiceDB, OpenFGA). This is done by a small resolver of our own in the shared domain package, so the device and the server run exactly the same checks. The server's check is the one that counts; the device's is for offline use and instant feedback. Its model follows OpenFGA's, so moving to OpenFGA later stays possible.

## Alternatives considered

- **An authorization service** (OpenFGA or SpiceDB): proven, but a separate service on every server, and devices would still need their own copy of the logic to work offline.
- **CASL**: runs on device and server, but is built for role rules rather than relationships, so grant inheritance would be hand-written anyway.
- **List-only sharing** (earlier drafts, Todoist, TickTick, Things, Linear): simpler, but needed the special rules above, and couldn't share one task without sharing its whole list.
- **Item grants that can also restrict** (Notion's restricted sub-pages): a task could be hidden from some of its list's collaborators. More flexible, but "who can see this?" would have to be checked per task, with more hidden-link cases.
- **A task in several lists** (Asana's multi-homing): visible to anyone who can see any of its lists. More powerful, but gives each task several homes, which complicates counts, moving and deleting.

## Consequences

- Graph logic still takes a viewer as input (see [Visibility-scoped graph](visibility-scoped-graph.md)). Direct task grants make hidden links rarer, but don't remove them.
- Every object has an ID and titles are only labels (see [IDs, not titles](ids-not-titles.md)).
- Access checks are core domain logic shared by device and server, and get thorough unit tests.

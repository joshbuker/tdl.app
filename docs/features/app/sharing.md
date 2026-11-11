# Sharing

Status: Proposed
Release: v1
Related: [Container and item grants](../../design-decisions/container-and-item-grants.md), [Visibility-scoped graph](../../design-decisions/visibility-scoped-graph.md), [Federation](federation.md), [Lists](../organization/lists.md), [Link tasks](../dependencies/link-tasks.md), [Assignment](../organization/assignment.md)

## Summary

The user shares a list, or a single task, with other users, who can then view or edit it. Tasks can be linked and assigned across users.

## Design intent

Planned for #1's beta ("Task Sharing") and in Slipstream's planned fields (AssignedTo, SharedTo). Never built. Needed at launch.

Access is granted on lists and on single tasks, like folders and files in Google Drive (see [Container and item grants](../../design-decisions/container-and-item-grants.md)). Sharing a list covers the common case in one step. Sharing a single task covers the rest, such as asking someone to do one thing without showing them the whole project. Links can still cross list and user boundaries, so a shared task can wait on someone's private task. Nobody sees any sign of tasks they have no access to.

## Rules

### Roles and grants

- Every list, and every task, has one owner: the owner of the list the task is in.
- Access can be granted on a list or on a single task, with one of these roles:
  - **Owner**: everything, including managing who has access and deleting the list.
  - **Editor**: edit, complete, add, link and delete tasks, and move them between lists with the same owner. On a single task, everything except deleting it or moving it to another list.
  - **Viewer**: read only.
  - **Outline**: can see that the task exists, how it is linked and whether it is complete, but not its title or any other details. Like free/busy in a shared calendar. Tasks a person can only see as an outline don't appear in their lists, presets or filters: they appear only as placeholders linked to tasks the person can see. They can't be linked to or assigned to that person.
- Access to a list gives that access to all of its tasks.
- A person's access to a task is the highest of what its list gives them and what the task gives them. Grants only add access: a task can't be hidden from someone who can see its list.
- The list owner manages who has access to the list and its tasks. Per list, the owner can also let the list's editors share single tasks. By default they can't. People with access to only a single task can't share it further.
- People are invited by username, and accept or decline the invitation. The owner can also create an invite link to a list, which anyone with an account can use to join until it is revoked. Both ways set the role.
- Users on different servers can share with each other (v2, see [Federation](federation.md)).
- The owner can transfer ownership of a list to an editor, who becomes the owner of the list and its tasks. The previous owner becomes an editor.

### Shared tasks

- A task shared directly with someone who can't see its list appears in their "Shared with me", and in any filter or preset it matches (see [Filtering and sorting](../views/filtering-and-sorting.md)). Its list is not shown to them.
- A task's title, notes, subtasks, completion, schedule and deadline are the same for everyone with access. Reminders are personal (see [Reminders](../scheduling/reminders.md)). History shows each person only what they can see (see [Task history](../tasks/task-history.md)).
- Only a task's owner can move it to a list with a different owner, so a task can't be taken from its owner. Moving a task to another list keeps its direct grants. Access through the old list is lost and access through the new list is gained. Before the move, the mover is told who will gain or lose access.
- Collaborators can leave a list shared with them. Someone a task was shared with directly can leave it by removing it from "Shared with me". Either way their access is removed, and the owner can see that they left.
- When sharing a task that has incomplete prerequisites the recipient can't see, the sharer is offered to share each of them too, either fully or as an outline. Only prerequisites the sharer is allowed to share are offered.

### Linked tasks and the graph

- Someone with edit access to two tasks can link them, even if they are in different lists or owned by different users (see [Link tasks](../dependencies/link-tasks.md)). What a person sees of a linked task depends on their access to it:
  - **Viewer or above**: the task as normal.
  - **Outline**: a placeholder showing that a task exists and how it links, with no title or details.
  - **No access**: no sign at all. The linked task and its links are not shown, and are ignored for that person's cycle checks, rejection messages and blocked indicators.
- Each person's next up, blocked indicators and graph-rule checks consider only tasks and links they can see (as a viewer or above, or as an outline). See [Visibility-scoped graph](../../design-decisions/visibility-scoped-graph.md).
- A link that would close a loop the person adding it can see is rejected (see [Link tasks](../dependencies/link-tasks.md)). A link that closes a loop only another person can see is allowed, as is a loop formed by changes made at the same time on different devices. Each person who can see the whole loop gets it flagged, naming the links involved, and its tasks stay blocked for them until someone removes one of those links. People who can't see the whole loop see no flag.
- Losing access to a list or task hides it. Links to it from the person's own tasks remain, but are treated like any other task they have no access to: not shown, and not blocking.

### Lists, tags, assignment and Trash

- The owner and editors can change a shared list's title, color and icon for everyone. Each person orders their lists themselves (see [Lists](../organization/lists.md)).
- Tags are shared separately, and sharing a task or list asks which of its tags to share too (see [Tags](../organization/tags.md)).
- A task can be assigned to anyone who can view it, or to someone outside the app as free text (see [Assignment](../organization/assignment.md)).
- Trashing a list or task is shared: it is in the Trash for everyone who can see it, and anyone who could delete it can restore it (see [Delete a task](../tasks/delete-task.md)).

## Scenarios

### Share a list

- Given "alice" owns the list "House"
- When she shares it with "bob" as an editor
- Then "bob" sees "House" and its tasks, and can edit them

### Viewer can't edit

- Given "bob" is a viewer of "House"
- When he tries to complete a task in "House"
- Then he can't

### Share a single task

- Given "alice" owns the list "House" with the tasks "Paint fence" and "Fix roof"
- When she shares "Paint fence" with "bob" as an editor
- Then "bob" sees "Paint fence" in "Shared with me", and can edit and complete it
- And he doesn't see "House" or "Fix roof"

### Task editor can't delete or move

- Given "alice" shared "Paint fence" with "bob" as an editor, and he can't see its list
- When he tries to delete it or move it to another list
- Then he can't

### Grants only add access

- Given "bob" is an editor of "House", and "alice" shares "Paint fence" in "House" with him as a viewer
- Then "bob" can still edit "Paint fence"

### Editors share tasks only if allowed

- Given "bob" is an editor of "House"
- When he tries to share "Paint fence" with "carol"
- Then he can't
- And once "alice" lets editors of "House" share tasks, he can

### Moving keeps direct grants

- Given "alice" shared "Paint fence" in "House" with "bob", and "carol" is a viewer of "House"
- When "alice" moves "Paint fence" to her list "Garden"
- Then she is told "carol" will lose access
- And after the move, "bob" still has access and "carol" doesn't

### Leave a shared task

- Given "alice" shared "Paint fence" with "bob"
- When "bob" removes it from "Shared with me"
- Then he no longer has access
- And "alice" sees that he left

### Editor can't move a task to another owner

- Given "bob" is an editor of alice's list "House"
- When he tries to move "Paint fence" into his own list "Weekend"
- Then he can't

### Leave a shared list

- Given "bob" is an editor of "House"
- When he leaves "House"
- Then he no longer sees "House" or its tasks
- And "alice" sees that he left

### Offer to share prerequisites

- Given "Buy paint" is an incomplete prerequisite of "Paint fence"
- When "alice" shares "Paint fence" with "bob", who can't see "Buy paint"
- Then she is offered to share "Buy paint" with him fully or as an outline

### Hidden blocker

- Given "Paint fence" is in the shared list "House"
- And "alice" makes her private task "Get paid" a prerequisite of "Paint fence"
- And "bob" has no access to "Get paid"
- Then "bob" doesn't see "Get paid", and "Paint fence" is next up for him

### Outline sees the shape

- Given "Get paid" is in alice's list "Money", and "bob" has outline access to "Money"
- And "Get paid" is a prerequisite of "Paint fence" in the shared list "House"
- Then "bob" sees "Paint fence" blocked by a task with no title, and its link

### Loop only another user can see

- Given in the shared list "Kitchen remodel", "bob" linked "Finalize budget" before his private task "Scope the job", and "Scope the job" before "Send estimate"
- And "alice" can't see "Scope the job"
- When "alice" makes "Send estimate" a prerequisite of "Finalize budget"
- Then the link is added, and "alice" sees no loop
- And "bob" sees the loop flagged, naming its three links

### Invite link

- Given "alice" created an invite link to "House" with the viewer role
- When "carol" opens the link while logged in
- Then "carol" is a viewer of "House"

### Transfer ownership

- Given "bob" is an editor of "House"
- When "alice" transfers ownership to "bob"
- Then "bob" owns "House" and its tasks, and "alice" is an editor

# Sharing

Status: Proposed
Release: v1
Related: [Federation](federation.md), [Lists](../organization/lists.md), [Link tasks](../dependencies/link-tasks.md), [Assignment](../organization/assignment.md)

## Summary

The user shares a list with other users, who can then view or edit its tasks. Tasks in shared lists can be assigned to collaborators.

## Design intent

Planned for #1's beta ("Task Sharing") and in Slipstream's planned fields (AssignedTo, SharedTo). Never built. Needed at launch.

Sharing is by list, like Todoist's shared projects, which keeps permissions simple: what you can do with a task follows from what you can do with its list. Links can still cross list boundaries, so a shared task can wait on someone's private task. Collaborators see that it's blocked without seeing the private task.

## Rules

- Lists are shared, not individual tasks.
- Each shared list has one owner, plus collaborators who are editors, viewers or outline viewers.
  - **Owner**: everything, including managing who has access and deleting the list.
  - **Editor**: everything except managing access and deleting the list.
  - **Viewer**: read only.
  - **Outline viewer**: can see that the list's tasks exist, how they are linked and whether each is complete, but not their titles or any other details. Like free/busy in a shared calendar.
- Access to a task follows access to its list.
- A task can be linked to any task the user can edit, even if collaborators can't see it. What a collaborator sees of a linked task in another list depends on their access to that list:
  - **Viewer or above**: the task as normal.
  - **Outline viewer**: a placeholder showing that a task exists and how it links, with no title or details.
  - **No access**: nothing. The linked task and its links are not shown at all, though a task it blocks still shows as blocked.
- Rejected links never reveal tasks the user can't see (e.g. "would create a cycle through a task you can't see").
- A task in a shared list can be assigned to one of the list's collaborators or its owner (see [Assignment](../organization/assignment.md)).
- Losing access to a list hides its tasks. Links to them from the user's own tasks remain and show as hidden blockers.
- People are invited by username, and accept or decline the invitation. The owner can also create an invite link, which anyone with an account can use to join until it is revoked. Both ways set the role (editor, viewer or outline viewer).
- Users on different servers can share lists with each other (see [Federation](federation.md)).
- A shared list has its own tags, used by everyone with access (see [Tags](../organization/tags.md)). Statuses already belong to each list (see [Statuses](../organization/statuses.md)).
- The owner can transfer ownership to an editor, who becomes the owner. The previous owner becomes an editor.

## Scenarios

### Share a list

- Given "alice" owns the list "House"
- When she shares it with "bob" as an editor
- Then "bob" sees "House" and its tasks, and can edit them

### Viewer can't edit

- Given "bob" is a viewer of "House"
- When he tries to complete a task in "House"
- Then he can't

### Hidden blocker

- Given "Paint fence" is in the shared list "House"
- And "alice" makes her private task "Get paid" a prerequisite of "Paint fence"
- And "bob" has no access to alice's list containing "Get paid"
- Then "bob" sees "Paint fence" as blocked, and doesn't see "Get paid"

### Outline viewer sees the shape

- Given "Get paid" is in alice's list "Money", and "bob" is an outline viewer of "Money"
- And "Get paid" is a prerequisite of "Paint fence" in the shared list "House"
- Then "bob" sees "Paint fence" blocked by a task with no title, and its link

### Invite link

- Given "alice" created an invite link to "House" with the viewer role
- When "carol" opens the link while logged in
- Then "carol" is a viewer of "House"

### Transfer ownership

- Given "bob" is an editor of "House"
- When "alice" transfers ownership to "bob"
- Then "bob" owns "House" and "alice" is an editor

## Open questions

- With no access, a task still shows as blocked, and a rejected link still says it would create a cycle. Both reveal that something hidden exists. Is that acceptable, or should a user with no access see no sign of it?

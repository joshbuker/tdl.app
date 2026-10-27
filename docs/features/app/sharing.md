# Sharing

Status: Proposed
Related: [Lists](../organization/lists.md), [Link tasks](../dependencies/link-tasks.md), [Delegation](../organization/delegation.md)

## Summary

The user shares a list with other users, who can then view or edit its tasks. Tasks in shared lists can be assigned to collaborators.

## Design intent

Planned for #1's beta ("Task Sharing") and in Slipstream's planned fields (AssignedTo, SharedTo). Never built. Needed at launch.

Sharing is by list, like Todoist's shared projects, which keeps permissions simple: what you can do with a task follows from what you can do with its list. Links can still cross list boundaries, so a shared task can wait on someone's private task. Collaborators see that it's blocked without seeing the private task.

## Rules

- Lists are shared, not individual tasks.
- Each shared list has one owner, plus collaborators who are editors or viewers.
  - **Owner**: everything, including managing who has access and deleting the list.
  - **Editor**: everything except managing access and deleting the list.
  - **Viewer**: read only.
- Access to a task follows access to its list.
- A task can be linked to any task the user can edit, even if collaborators can't see it. Collaborators see such a link as "blocked by a task you can't see", with no title or details.
- Rejected links never reveal tasks the user can't see (e.g. "would create a cycle through a task you can't see").
- A task in a shared list can be assigned to one of the list's collaborators or its owner. Each user can filter for tasks assigned to them.
- Losing access to a list hides its tasks. Links to them from the user's own tasks remain and show as hidden blockers.
- People are invited by username, and accept or decline the invitation. The owner can also create an invite link, which anyone with an account can use to join until it is revoked. Both ways set the role (editor or viewer).
- Users on different servers can share lists with each other (see [Self-hosting](../../design-decisions/self-hosting.md)).
- A shared list has its own tags and statuses, used by everyone with access (see [Tags](../organization/tags.md) and [Statuses](../organization/statuses.md)).
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
- Then "bob" sees "Paint fence" as blocked by a task he can't see

### Invite link

- Given "alice" created an invite link to "House" with the viewer role
- When "carol" opens the link while logged in
- Then "carol" is a viewer of "House"

### Transfer ownership

- Given "bob" is an editor of "House"
- When "alice" transfers ownership to "bob"
- Then "bob" owns "House" and "alice" is an editor

### Assign a task

- Given "bob" is an editor of "House"
- When "alice" assigns "Paint fence" to "bob"
- Then "Paint fence" shows up when "bob" filters for tasks assigned to him

## Open questions

- How do users on different servers find and invite each other (e.g. `alice@tdl.example.com`), and which protocol syncs between servers?
- Are routines per user or shared with a list?

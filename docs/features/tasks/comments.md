# Comments

Status: Proposed
Release: v1
Related: [Sharing](../app/sharing.md), [Assignment](../organization/assignment.md), [Task history](task-history.md)

## Summary

People with access to a task can discuss it in comments, and the people involved are notified.

## Design intent

Wanted in earlier notes (TDL App Shared Tasks, Todoist features we like) once tasks are shared. No earlier attempt built comments. Notes describe the task itself; comments are the conversation about it, so they don't overwrite each other.

A commenter role sits between editor and viewer, so someone can take part in the discussion without being able to change the task (see [Sharing](../app/sharing.md)).

## Rules

- People with commenter access or above can add comments to a task. Viewers can read comments but not add them. Outline access (v2) shows no comments.
- A comment records who wrote it and when.
- The author can edit or delete their own comment. An edited comment shows that it was edited. The task's owner can also delete any comment.
- Deleting a comment deletes it permanently, including its text in history. The task's history keeps only that a comment was deleted, by whom and when (see [Current state and history](../../design-decisions/current-state-and-history.md)).
- New comments notify the task's assignee, its participants, and everyone who has commented on it, except the author (see [Assignment](../organization/assignment.md)). Mentioning someone with access notifies them too.
- Comments are synced and work offline like any other change (see [Offline use](../app/offline.md)).
- Comments can have attachments (see [Attachments](attachments.md)).
- Comments are markdown, like task notes (see [Edit a task](edit-task.md)).

## Scenarios

### Comment on a shared task

- Given "bob" is a commenter on alice's list "House"
- When he comments "Which color?" on "Paint fence"
- Then everyone with commenter access or above sees the comment, with "bob" as author

### Viewer can read but not comment

- Given "carol" is a viewer of "House", and "Paint fence" has a comment
- Then "carol" sees the comment
- And she can't add a comment

### Assignee is notified

- Given "Paint fence" is assigned to "bob"
- When "alice" comments on it
- Then "bob" is notified of the comment

### Edit your own comment

- Given "bob" commented "Which color?"
- When he edits it to "Which shade of white?"
- Then the comment shows the new text and that it was edited

### Delete your own comment

- Given "bob" commented "Which color?" on "Paint fence"
- When he deletes it
- Then the comment is gone for everyone

### Owner deletes someone else's comment

- Given "bob" commented "Which color?" on alice's task "Paint fence"
- When "alice" deletes his comment
- Then the comment is gone for everyone

### Editors can't delete others' comments

- Given "carol" is an editor of alice's list "House", and "bob" commented on "Paint fence"
- Then "carol" can't delete bob's comment

### Mentioned person is notified

- Given "carol" can view "Paint fence", and isn't its assignee, a participant or a commenter on it
- When "bob" mentions "carol" in a comment on it
- Then "carol" is notified of the comment

### Earlier commenters are notified, not the author

- Given "carol" has commented on "Paint fence"
- When "bob" comments on it
- Then "carol" is notified of bob's comment
- And "bob" is not

### Comment offline

- Given "bob" is offline
- When he comments on "Paint fence"
- Then the comment shows on the task, and others see it once he is back online

### Attach a file to a comment

- When "bob" attaches a photo to his comment on "Paint fence"
- Then everyone who can see the comment can open the photo

### Comments use markdown

- When "bob" comments "**Which** color?"
- Then the comment shows "Which" in bold

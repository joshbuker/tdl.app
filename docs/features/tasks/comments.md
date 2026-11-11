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

- People with commenter access or above can add comments to a task. Viewers can read comments but not add them. Outline access shows no comments.
- A comment records who wrote it and when.
- The author can edit or delete their own comment. An edited comment shows that it was edited. The task's owner can also delete any comment.
- New comments notify the task's assignee, its participants, and everyone who has commented on it, except the author (see [Assignment](../organization/assignment.md)). Mentioning someone with access notifies them too.
- Comments are synced and work offline like any other change (see [Offline use](../app/offline.md)).
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

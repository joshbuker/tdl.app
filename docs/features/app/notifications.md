# Notifications

Status: Proposed
Release: v1
Related: [Reminders](../scheduling/reminders.md), [Comments](../tasks/comments.md), [Assignment](../organization/assignment.md), [Sharing](sharing.md)

## Summary

The user is notified about reminders and about changes others make to tasks they're involved in, and chooses which kinds they get.

## Design intent

Once tasks are shared, people need to know when something needs them without checking every list. Todoist's notifications for assignments, comments and completions were on the "features we like" list. #1 sent web push notifications and #2 local notifications on Android, both only for reminders.

## Rules

- The user is notified when:
  - a reminder fires (see [Reminders](../scheduling/reminders.md));
  - a task is assigned to them by someone else (see [Assignment](../organization/assignment.md));
  - someone else comments on a task as described in [Comments](../tasks/comments.md);
  - someone else completes a task they're assigned to or participate in;
  - someone invites them to a list or task (see [Sharing](sharing.md)).
- Nobody is notified about their own changes.
- Notifications go to all of the user's devices that have them enabled, as push notifications, and to an in-app list where they can be read later.
- Each kind of notification can be turned on or off in settings, separately for push and the in-app list. All are on by default.
- Opening a notification opens the task (or invitation) it is about, and marks it read.
- People who can't see a task get no notifications about it.

## Scenarios

### Assigned to you

- Given "alice" and "bob" share "House"
- When "alice" assigns "Paint fence" to "bob"
- Then "bob" is notified, and opening the notification opens "Paint fence"

### Completion of a task you're on

- Given "carol" is a participant on "Paint fence"
- When "bob" completes it
- Then "carol" is notified that "bob" completed "Paint fence"

### Your own changes don't notify you

- Given "bob" is assigned "Paint fence"
- When "bob" completes it
- Then "bob" is not notified

### Turn a kind off

- Given "carol" turned off completion notifications
- When "bob" completes a task "carol" participates in
- Then "carol" gets no notification for it

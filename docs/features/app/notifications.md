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
- Reminders are scheduled on each device ahead of time, so they fire on time even offline (see [Reminders](../scheduling/reminders.md)). Other notifications are pushed to all of the user's devices that have them enabled as they happen. All notifications also go to an in-app list where they can be read later.
- Each kind of notification can be turned on or off in settings, separately for push and the in-app list. All are on by default.
- Opening a notification opens the task (or invitation) it is about, and marks it read.
- People who can't see a task get no notifications about it.
- The device that makes a change works out who to notify, and tells the server only whom to send to, with an encrypted body. Each person's notification settings are applied on their own devices.
- Push notifications carry no readable content.
- Self-hosted servers can't send pushes to the Android and iOS apps directly, since that needs the app publisher's credentials. They can opt in to a push relay run by tdl.app, free of charge, which only ever sees encrypted payloads and device tokens. Without it, the apps get changes when they're open and sync, and reminders still fire, since they're scheduled on the device. The device decrypts what it needs to show (see [End-to-end encryption](end-to-end-encryption.md)).

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

### Invited to a list

- When "alice" invites "bob" to her list "House"
- Then "bob" is notified, and opening the notification opens the invitation

### Read later in the in-app list

- Given "alice" assigned "Paint fence" to "bob" while he was away
- When he opens his in-app notification list
- Then the notification is there, unread

### Opening marks it read

- Given "bob" has an unread notification that he was assigned "Paint fence"
- When he opens it from the in-app list
- Then "Paint fence" opens, and the notification is marked read

### Push and in-app list are set separately

- Given "carol" turned off push for completion notifications, but kept them in the in-app list
- When "bob" completes a task "carol" participates in
- Then "carol" gets no push, and the notification is in her in-app list

### No notifications about tasks you can't see

- Given "carol" was a participant on "Paint fence", and has since lost access to it
- When "bob" completes it
- Then "carol" is not notified

### Pushes carry no readable content

- When "bob" is notified that he was assigned "Paint fence"
- Then the push sent through the server contains no title
- And his device shows "Paint fence"

### Self-hosted server without the push relay

- Given alice's self-hosted server doesn't use the push relay, and bob's phone app is closed
- When "alice" assigns "Paint fence" to "bob"
- Then he gets no push
- And he sees the notification once he opens the app and it syncs

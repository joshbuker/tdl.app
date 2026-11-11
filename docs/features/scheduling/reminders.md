# Reminders

Status: Proposed
Release: v1
Related: [Schedule](schedule.md)

## Summary

A task can have one or more reminder times, and the user gets a notification on their devices at each.

## Design intent

Built twice: #1 sent web push notifications to every subscribed device, and #2 scheduled local notifications on Android. #3 kept the code but never called it. Reminders are a key reason the app has to run on mobile.

## Rules

- Dates and times work as in [Schedule](schedule.md): a date alone is a calendar date, and a time records its time zone (see [Floating dates, zoned times](../../design-decisions/floating-dates-zoned-times.md)).
- A task can have any number of reminders, each with its own date and time, separate from the task's schedule.
- A reminder can be set relative to the scheduled time (e.g. "at the scheduled time" or "15 minutes before"). A relative reminder moves when the schedule changes, including to each new occurrence of a [recurring task](recurring-tasks.md). A reminder set at a fixed date and time stays put.
- A reminder fires once at its time. Its notification offers Complete, Snooze and Dismiss.
- Snoozing moves only that reminder to a later time: 10 minutes, 1 hour, tomorrow morning, or a chosen time. The task's schedule doesn't change.
- A setting adds a default reminder to tasks when a time is scheduled: off (the default), at the scheduled time, or a chosen number of minutes before. It is an ordinary relative reminder, which the user can change or remove.
- Completing a task cancels its pending reminders. Marking it incomplete again reinstates those still in the future. Ones whose time passed while it was complete don't fire late.
- Changing or clearing the reminder time changes or cancels the notification.
- A reminder time in the past does not fire.
- Reminders are personal. On a task shared with others, each person sets their own, and only they are notified (see [Sharing](../app/sharing.md)).
- Reminders are scheduled ahead of time as local notifications on each of the user's devices that have notifications enabled, rather than pushed by the server when they're due. That way they fire on time even when the device is offline or a push is delayed. When a reminder is added, changed or cancelled, each device reschedules it once it syncs (see [Notifications](../app/notifications.md)).
- The web app fires reminders only while it is open, like Google Calendar, since browsers can't schedule notifications for later. The phone and desktop apps are how reminders reach the user otherwise (see [Platforms](../app/platforms.md)).

## Scenarios

### Reminder fires

- Given a task "Call plumber" with a reminder at 9:00
- When it is 9:00
- Then the user gets a notification for "Call plumber"

### Relative reminder moves with the schedule

- Given "Call plumber" is scheduled for 10:00 with a reminder 15 minutes before
- When the user reschedules it to 14:00
- Then the reminder fires at 13:45

### Snooze a reminder

- Given "Call plumber" has a reminder at 9:00
- When the reminder fires and the user snoozes it for 1 hour
- Then it fires again at 10:00
- And the task's schedule is unchanged

### Default reminder

- Given "alice" set her default reminder to 15 minutes before
- When she schedules "Call plumber" for Thursday at 10:00
- Then "Call plumber" has a reminder at 09:45, which she can remove

### Web reminders need the app open

- Given "Call plumber" has a reminder at 9:00, and "alice" only uses the web app
- When it is 9:00 and the web app is open
- Then she gets the notification
- And if the web app is closed at 9:00, no notification fires from the web app

### Reopening reinstates future reminders

- Given "Call plumber" has a reminder tomorrow at 9:00, and is completed
- When the user marks it incomplete
- Then the reminder fires tomorrow at 9:00

### Cancel a reminder

- Given a task with a reminder
- When the user clears the reminder
- Then no notification is sent

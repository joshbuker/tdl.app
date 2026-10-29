# Reminders

Status: Proposed
Release: v1
Related: [Schedule](schedule.md)

## Summary

A task can have one or more reminder times, and the user gets a notification on their devices at each.

## Design intent

Built twice: #1 sent web push notifications to every subscribed device, and #2 scheduled local notifications on Android. #3 kept the code but never called it. Reminders are a key reason the app has to run on mobile.

## Rules

- A task can have any number of reminders, each with its own date and time, separate from the task's schedule.
- A reminder can be set relative to the scheduled time (e.g. "at the scheduled time" or "15 minutes before"). A relative reminder moves when the schedule changes, including to each new occurrence of a [recurring task](recurring-tasks.md). A reminder set at a fixed date and time stays put.
- A reminder fires once at its time.
- Completing a task cancels its pending reminders. Marking it incomplete again reinstates those still in the future. Ones whose time passed while it was complete don't fire late.
- Changing or clearing the reminder time changes or cancels the notification.
- A reminder time in the past does not fire.
- Notifications go to all of the user's devices that have notifications enabled.

## Scenarios

### Reminder fires

- Given a task "Call plumber" with a reminder at 9:00
- When it is 9:00
- Then the user gets a notification for "Call plumber"

### Relative reminder moves with the schedule

- Given "Call plumber" is scheduled for 10:00 with a reminder 15 minutes before
- When the user reschedules it to 14:00
- Then the reminder fires at 13:45

### Reopening reinstates future reminders

- Given "Call plumber" has a reminder tomorrow at 9:00, and is completed
- When the user marks it incomplete
- Then the reminder fires tomorrow at 9:00

### Cancel a reminder

- Given a task with a reminder
- When the user clears the reminder
- Then no notification is sent

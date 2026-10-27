# Reminders

Status: Proposed
Related: [Schedule](schedule.md)

## Summary

A task can have one or more reminder times, and the user gets a notification on their devices at each.

## Design intent

Built twice: #1 sent web push notifications to every subscribed device, and #2 scheduled local notifications on Android. #3 kept the code but never called it. Reminders are a key reason the app has to run on mobile.

## Rules

- A task can have any number of reminders, each with its own date and time, separate from the task's schedule.
- A reminder can be set relative to the scheduled time (e.g. "at the scheduled time" or "15 minutes before").
- A reminder fires once at its time.
- Completing a task cancels its pending reminders.
- Changing or clearing the reminder time changes or cancels the notification.
- A reminder time in the past does not fire.
- Notifications go to all of the user's devices that have notifications enabled.

## Scenarios

### Reminder fires

- Given a task "Call plumber" with a reminder at 9:00
- When it is 9:00
- Then the user gets a notification for "Call plumber"

### Cancel a reminder

- Given a task with a reminder
- When the user clears the reminder
- Then no notification is sent

## Open questions

- If the schedule changes, do relative reminders move with it?
- If a completed task is marked incomplete again, do its future reminders come back?

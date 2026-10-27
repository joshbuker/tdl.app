# Time zone

Status: Proposed
Related: [Schedule](../scheduling/schedule.md)

## Summary

The user sets their time zone, which decides what "today" means across the app.

## Design intent

In every attempt. What counts as "today", and when reminders fire, depend on it. It is stored on the account rather than taken from the device, so all devices agree.

## Rules

- The default is UTC.
- Only valid time zones are accepted.
- Changing the time zone immediately updates what counts as today and the times shown.

## Scenarios

### Today follows the user's time zone

- Given the user's time zone is Tokyo and it is 23:30 on Monday in Tokyo (14:30 Monday UTC)
- And a task is scheduled for Tuesday
- Then the task does not count as today's, even though it is already Monday 14:30 in UTC

## Open questions

- Should the app suggest the device's time zone when it differs?

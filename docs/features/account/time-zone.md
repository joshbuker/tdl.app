# Time zone

Status: Proposed
Release: v1
Related: [Schedule](../scheduling/schedule.md)

## Summary

The user sets their time zone, which decides what "today" means across the app.

## Design intent

In every attempt. What counts as "today", and when reminders fire, depend on it. It is stored on the account rather than taken from the device, so all devices agree.

## Rules

- The default is UTC.
- Only valid time zones are accepted.
- Changing the time zone immediately updates what counts as today and the times shown.
- When the device's time zone differs from the account's, the app offers to switch. The user can switch, keep the account's time zone, or dismiss the offer for that time zone. The time zone never changes without the user choosing it, so travelling doesn't shift dates by surprise.

## Scenarios

### Today follows the user's time zone

- Given the user's time zone is Tokyo and it is 23:30 on Monday in Tokyo (14:30 Monday UTC)
- And a task is scheduled for Tuesday
- Then the task does not count as today's, even though it is already Monday 14:30 in UTC

### Suggest the device's time zone

- Given the account's time zone is Tokyo and the device is in Paris
- When the user opens the app
- Then the app offers to switch to Paris, and nothing changes until the user accepts

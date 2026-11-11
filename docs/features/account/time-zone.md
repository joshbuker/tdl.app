# Time zone

Status: Proposed
Release: v1
Related: [Schedule](../scheduling/schedule.md)

## Summary

The user sets their time zone, which decides what "today" means across the app.

## Design intent

In every attempt. What counts as "today", and when reminders fire, depend on it. It is stored on the account rather than taken from the device, so all devices agree.

## Rules

- A new account's time zone is the device's time zone at sign-up, or UTC if it can't be detected.
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

### New account uses the device's time zone

- Given "carol"'s device is set to Paris
- When she signs up
- Then her time zone is Paris

### UTC when the time zone can't be detected

- Given the device's time zone can't be detected
- When "carol" signs up
- Then her time zone is UTC

### Invalid time zone

- When the user sets their time zone to "Mars/Olympus"
- Then it is rejected

### Changing the time zone updates today

- Given the user's time zone is Paris and it is 23:30 on Monday in Paris (07:30 Tuesday in Tokyo)
- And "Call plumber" is scheduled for Tuesday
- When the user changes their time zone to Tokyo
- Then "Call plumber" counts as today's at once

### Dismiss the offer for a time zone

- Given the account's time zone is Tokyo, the device is in Paris, and the user dismissed the offer to switch to Paris
- When the user opens the app again in Paris
- Then the app doesn't offer to switch to Paris again

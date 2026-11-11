# Personalization

Status: Proposed
Release: v1

## Summary

Display preferences: which pages appear in navigation, the default page, theme, text size, time format, background, notification duration, and sounds.

## Design intent

From #3, where each of these was a setting. #3 also played a sound when checking or unchecking a task. Its notification durations were Fast, Med and Slow (1.5, 3 and 4.5 seconds), defaulting to Slow so there is time to tap Undo. #3 applied the duration to error notices too.

## Rules

- Settings are stored on the account, so they follow the user across devices. Any setting can be overridden on a single device (e.g. a different default page on a phone).
- The default page is chosen from the enabled pages.
- Navigation can be reset to the default set of pages.
- Keyboard shortcuts can be changed (see [Keyboard shortcuts](keyboard-shortcuts.md)).
- The user can choose a background.
- The theme is light, dark, or follows the device's setting. Following the device is the default.
- Text size follows the device's setting, and can be scaled further in the app.
- Times are shown in 12-hour or 24-hour format. The default comes from the user's language and region.
- The user can choose how long in-app notices stay on screen: Slow, Medium or Fast. The default is Slow.
- Error notices ignore the notification duration and stay on screen until the user dismisses them.
- A sound plays when a task is checked or unchecked. Sounds can be turned off.

## Scenarios

### Settings follow the user

- Given "alice" sets her default page to Calendar on her laptop
- When she logs in on her phone
- Then the app opens on Calendar

### Override on one device

- Given "alice"'s default page is Calendar
- When she sets the default page to List on her phone only
- Then her phone opens on List
- And her laptop still opens on Calendar

### Default page must be enabled

- Given Calendar is not enabled in "alice"'s navigation
- When she chooses a default page
- Then Calendar is not offered

### Reset navigation

- Given "alice" has hidden Graph from navigation
- When she resets navigation
- Then the default set of pages is shown, including Graph

### Notification duration

- Given "alice" set the notification duration to Fast
- When she completes a task
- Then the Undo notice stays on screen for the Fast duration

### Errors stay until dismissed

- Given "alice" set the notification duration to Fast
- When an error notice is shown
- Then it stays on screen until she dismisses it

### Theme follows the device

- Given "alice" hasn't chosen a theme, and her phone is set to dark mode
- Then the app is dark on her phone

### 24-hour time

- Given "alice" chose 24-hour time
- Then a task scheduled for 3pm shows 15:00

### Turn off sounds

- Given "alice" turned sounds off
- When she completes a task
- Then no sound plays

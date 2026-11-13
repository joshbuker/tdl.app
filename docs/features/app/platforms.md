# Platforms

Status: Proposed
Release: v1
Related: [Reminders](../scheduling/reminders.md)

## Summary

The app runs on the web, Android, iOS and desktop, all at launch.

## Design intent

Attempt #1 ended because it was "web only" and "couldn't compile down to mobile/desktop apps". #2 and #3 used one codebase for web, Android (Capacitor) and desktop (Electron, never customized). #2 was also an installable web app (PWA); #3 dropped that because of outdated dependencies.

## Rules

- Web, Android, iOS and desktop (Windows, macOS, Linux) are all supported at launch.
- The web app is not an installable PWA. Native mobile and desktop packages cover installed use.
- Same features on every platform, except where a platform can't support one (e.g. scheduled notifications on web).
- On the web, the app is used in one tab at a time. Another tab says the app is open in another tab, and continues once that tab is closed.
- If the app can't open its storage on the device (for example, the browser blocks it or the disk is full), it shows a page saying it couldn't start, with the reason and a button to reload. It doesn't run without its storage.

## Scenarios

### Available on every platform at launch

- When the app launches
- Then it can be used on the web, Android, iOS, Windows, macOS and Linux

### Web app isn't installable

- When "alice" opens the web app in a browser
- Then it doesn't offer to be installed as an app

### Same features on every platform

- Given "alice" uses the Android app and the web app
- Then both offer the same features, except those a platform can't support, such as scheduled notifications on the web

### Open in a second tab

- Given "alice" has the web app open in a tab
- When she opens it in a second tab
- Then the second tab says it's open in another tab
- And once she closes the first tab, the second shows her tasks

### Storage can't be opened

- Given the browser won't let the app open its storage
- When "alice" opens the web app
- Then it says the app couldn't start, and why
- And it offers a button to reload

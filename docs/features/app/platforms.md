# Platforms

Status: Proposed
Related: [Reminders](../scheduling/reminders.md)

## Summary

The app runs on the web, Android, and desktop.

## Design intent

Attempt #1 ended because it was "web only" and "couldn't compile down to mobile/desktop apps". #2 and #3 used one codebase for web, Android (Capacitor) and desktop (Electron, never customized). #2 was also an installable web app (PWA); #3 dropped that because of outdated dependencies.

## Rules

- Same features on every platform, except where a platform can't support one (e.g. scheduled notifications on web).

## Scenarios

- To be defined per platform once the stack is chosen.

## Open questions

- Which platforms at launch: web, Android, iOS, desktop?
- Installable web app (PWA)?

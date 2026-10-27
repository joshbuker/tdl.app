# Keyboard shortcuts

Status: Proposed

## Summary

Single-key shortcuts for common actions.

## Design intent

From #3: `q` to create a task and `/` to search.

## Rules

- Shortcuts don't fire while typing in a text field.
- Shortcuts don't open a second dialog on top of one they opened.

## Scenarios

### Open search

- Given no text field is focused
- When the user presses "/"
- Then search opens

### Typing is not a shortcut

- Given the user is typing in a task's notes
- When they type "q"
- Then "q" is typed and no dialog opens

## Open questions

- Full shortcut list, and should they be customizable?

# Keyboard shortcuts

Status: Proposed
Release: v1

## Summary

Single-key shortcuts for common actions.

## Design intent

From #3: `q` to create a task and `/` to search.

## Rules

- Shortcuts don't fire while typing in a text field.
- Shortcuts don't open a second dialog on top of one they opened.
- The user can change any shortcut. Shortcuts are stored on the account with other settings, and can be reset to the defaults (see [Personalization](personalization.md)).
- The full list of default shortcuts is decided during UI design.

## Scenarios

### Open search

- Given no text field is focused
- When the user presses "/"
- Then search opens

### Typing is not a shortcut

- Given the user is typing in a task's notes
- When they type "q"
- Then "q" is typed and no dialog opens

### Change a shortcut

- Given the user changes the create-task shortcut from "q" to "n"
- When they press "n" with no text field focused
- Then the create-task dialog opens

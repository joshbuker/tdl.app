# Offline use

Status: Proposed
Release: v1
Related: [Platforms](platforms.md), [Offline first](../../design-decisions/offline-first.md)

## Summary

Everything works without a connection. Changes made offline sync when the device is back online.

## Design intent

#3 cached data locally so it could be read offline, but every change went straight to the server, and a TODO noted client-generated IDs as the first step towards offline creation. A todo app on a phone is often used with poor or no signal, and capture especially can't wait for a connection.

## Rules

- Every feature that doesn't inherently need the server (e.g. sign-up, sharing invitations) works offline, including creating, editing, linking and completing tasks.
- Changes made offline are kept on the device and synced when back online, in the order they were made.
- New items get their IDs on the device, so they can be linked and edited before syncing.
- Graph rules (no cycles, no redundant links) are checked on the device when offline, and again by the server when syncing.
- The user can see whether there are changes waiting to sync.
- A device can stay offline for any length of time. Its unsynced changes are always kept and synced, and the server keeps the full change history so any device can catch up.
- Conflicting edits are resolved automatically when there is a clear answer, and the user is asked when there isn't:
  - Edits to different fields of the same task are both kept.
  - When only one side changed a field, or both changed it to the same value, that value is kept.
  - Edits to non-overlapping parts of a task's notes are merged.
  - When both sides changed the same field to different values, or overlapping parts of the notes, the task is marked as conflicting and the user chooses which version to keep. Until then, the most recent edit is shown.
- When changes that are each valid on their own would together break a graph rule (e.g. two offline devices each add a link, and together they form a cycle), the change that reaches the server first wins. The other is undone on the device that made it, and its user is told why.
- When a task is deleted on one device and edited on another, the delete wins and the edit is applied to the task in the Trash, so nothing is lost and it can be restored.

## Scenarios

### Create offline

- Given the device is offline
- When the user creates "Buy milk"
- Then "Buy milk" appears immediately
- And it reaches the server when the device is back online

### Link offline

- Given the device is offline
- When the user creates "Buy paint" and makes it a prerequisite of "Paint fence"
- Then the link is shown immediately and synced later

### Edits to different fields merge

- Given "Paint fence" is edited offline on two devices: one changes its title to "Paint the fence", the other sets its deadline to Friday
- When both devices sync
- Then "Paint fence" is titled "Paint the fence" and is due Friday

### Conflicting edits ask the user

- Given one offline device renames "Paint fence" to "Paint the fence" and another renames it to "Stain fence"
- When both devices sync
- Then the task is marked as conflicting, and the user can choose "Paint the fence" or "Stain fence"

### Links that together form a cycle

- Given "A" and "B" are unlinked, and two devices are offline
- When the phone makes "A" a prerequisite of "B", the laptop makes "B" a prerequisite of "A", and the phone syncs first
- Then "A" before "B" is kept
- And when the laptop syncs, its link is undone and the user is told it would have created a cycle

### Delete beats edit

- Given the phone deletes "Buy milk" offline, and the laptop renames it to "Buy oat milk" offline
- When both devices sync
- Then "Buy oat milk" is in the Trash

## Open questions

- On a shared list, who is asked to resolve a conflict: the user whose change synced second, or anyone with edit access?
- Does a conflict on a field like status or schedule need the user, or should those use the most recent edit (e.g. two people completing the same task)?

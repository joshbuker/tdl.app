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
- Graph rules (no cycles, no redundant links) are checked on the device when a link is added, online or offline.
- While online, changes are synced as they happen, and the server pushes changes from other devices and collaborators to open apps within a few seconds, without a refresh.
- The user can see whether there are changes waiting to sync.
- A device can stay offline for any length of time. Its unsynced changes are always kept and synced, and the server keeps the full change history so any device can catch up.
- Conflicting edits are resolved automatically when there is a clear answer, and the user is asked when there isn't:
  - Edits to different fields of the same task are both kept.
  - When only one side changed a field, or both changed it to the same value, that value is kept.
  - Edits to non-overlapping parts of a task's notes are merged (v2). Until then, notes are treated like any other field.
  - When both sides changed the same field to different values, the most recent edit is kept. Both versions stay in the task's history, so the other can be restored by hand.
  - Instead of keeping the most recent edit, the task is marked as conflicting and the user chooses which version to keep. Until then, the most recent edit is shown (v2).
- Conflicts are resolved per user: the user whose device detects the conflict while syncing (because the other change reached the server first) is the one asked. This applies on shared lists too (v2).
- Every synced change is kept in the task's history (see [Task history](../tasks/task-history.md)), including changes that were overridden or that duplicated another. Changes made concurrently on different devices are flagged as such, e.g. a task completed twice by two people while offline shows both completions, flagged as a double completion.
- When changes that are each valid on their own together break a graph rule, both are kept rather than one being undone. A loop formed this way is flagged to each user who can see all of it (see [Sharing](sharing.md)), and a link made redundant this way is shown as redundant (see [Link tasks](../dependencies/link-tasks.md)).
- When the server rejects changes a device made offline (e.g. the account became read-only, or the user lost access to a list), the device keeps them in a "couldn't sync" view that says why. The user can copy their content into their own lists, for example as a new task, or discard them. Nothing they typed is silently lost.
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

### Conflicting edits keep the most recent

- Given one offline device renames "Paint fence" to "Paint the fence", and later another renames it to "Stain fence"
- When both devices sync
- Then the task is called "Stain fence"
- And its history shows both renames

### Links that together form a cycle

- Given "A" and "B" are unlinked, and two devices are offline
- When the phone makes "A" a prerequisite of "B", the laptop makes "B" a prerequisite of "A"
- And both devices sync
- Then both links are kept
- And the user sees the loop between "A" and "B" flagged

### Live updates

- Given "alice" and "bob" both have "House" open and are online
- When "bob" completes "Paint fence"
- Then "alice" sees it completed within a few seconds, without refreshing

### Rejected offline changes are kept

- Given "bob" edited "Paint fence" offline, and meanwhile lost access to "House"
- When his device syncs
- Then his edit is shown under "couldn't sync", saying he no longer has access
- And he can copy it into one of his own lists as a new task, or discard it

### Delete beats edit

- Given the phone deletes "Buy milk" offline, and the laptop renames it to "Buy oat milk" offline
- When both devices sync
- Then "Buy oat milk" is in the Trash

### Double completion is recorded

- Given "alice" and "bob" both complete "Buy milk" while offline
- When both devices sync
- Then "Buy milk" is completed, and its history shows both completions, flagged as a double completion

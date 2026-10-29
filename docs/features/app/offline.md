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

## Open questions

- How are conflicts between devices resolved (e.g. both edit the same title, or each adds a link that together would form a cycle)?
- How long can a device stay offline before it must re-sync from scratch?

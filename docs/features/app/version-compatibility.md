# Version compatibility

Status: Proposed
Release: v1
Related: [Offline use](offline.md), [Choose a server](../account/choose-server.md), [Federation](federation.md), [API access](api-access.md), [Self-hosting](../../design-decisions/self-hosting.md), [Protocol versions](../../design-decisions/protocol-versions.md)

## Summary

An app that's older or newer than its server keeps working on the device, never loses changes, and tells the user what to update. Updating the app moves its data and unsynced changes to the new version.

## Design intent

Apps update on their own schedule: app stores delay releases, people postpone updates, and self-hosted servers are updated whenever their admin gets to it (see [Self-hosting](../../design-decisions/self-hosting.md)). Without a plan, an app that falls behind either stops syncing for good or throws away changes. Attempts #1 to #3 never handled this.

Breaking changes require updating rather than the server translating old formats, because from v2 content is end-to-end encrypted and only devices can change it (see [End-to-end encryption](end-to-end-encryption.md)). So the device migrates its own data when it updates.

## Rules

- Apps and servers each have a protocol version, `major.minor`: the version of the language they sync in. Apps send theirs with every sync request, and the server answers with its own.
- A minor version only adds things: new fields, record types or kinds of change. Apps and servers with the same major version are compatible.
- An app that receives data it doesn't understand (from a newer minor version) stores it untouched, doesn't show it, and keeps syncing. Once updated, it applies that data without downloading anything again.
- When the server's major version is newer than the app's, the server refuses the app's sync. The app keeps working on the device as if offline: changes are saved and queued, and a banner says to update the app to sync, with a way to update (the app store, the desktop app's updater, or reloading the web app).
- When the app's major version is newer than the server's, the app says the server needs updating, naming the server, and keeps working on the device the same way.
- A sync refused for its version keeps its changes queued. They are never dropped.
- Updating the app migrates its local data, including queued changes, to the new version before it next syncs.
- The web app is loaded from the server, so it matches the server's version once reloaded. An open tab that finds the server has a newer major version offers to reload, and its queued changes survive the reload.
- [Choose a server](../account/choose-server.md) refuses a server with a different major version, with the same message.
- The public API follows the same versions, and programs must update at a major change too (see [API access](api-access.md)).

## Scenarios

### Outdated app keeps working

- Given "alice"'s phone app is on an older major version than her server
- When she edits "Paint fence"
- Then the change is saved on her phone, and a banner says to update the app to sync

### Updating syncs queued changes

- Given "alice"'s outdated phone app has queued changes to "Paint fence"
- When she updates the app
- Then the changes sync, and none are lost

### Unknown data is kept

- Given "alice"'s laptop app is on a newer minor version that adds a field, and her phone app is on the older one
- When she sets that field on "Paint fence" from her laptop
- Then her phone keeps syncing, and doesn't show the field
- And after she updates the phone app, it shows the field without downloading everything again

### Server too old

- Given "tdl.example.com" runs an older major version than "alice"'s app
- When the app syncs
- Then she is told tdl.example.com needs updating
- And her changes are saved on the device and queued

### Open web tab after a server update

- Given "alice" has the web app open with an unsynced change, and the server is updated to a new major version
- When the tab next syncs
- Then it offers to reload, and after reloading the change syncs

## Open questions

- **A newer minor app on an older minor server.** The app could send a field the server doesn't know yet, which the server would refuse as `unknown-field`. Options:
  - **The app hides features the server's minor version lacks**, using the version the server answers with.
  - **The server stores fields it doesn't know untouched**, as apps do. It can't validate them, but from v2 it can't read content anyway.
  - **Treat it like a major mismatch:** the user is told the server needs updating.
- **Migrating server-held data at a major change (v2, deferred).** With end-to-end encryption, only devices can rewrite content, so data on the server stays in the old format until a device migrates it. Options:
  - **The first updated device with access** rewrites and re-uploads each record.
  - **Lazily:** each record is migrated the next time it's edited.

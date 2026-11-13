# Version compatibility

Status: Proposed
Release: v1
Related: [Offline use](offline.md), [Choose a server](../account/choose-server.md), [Federation](federation.md), [API access](api-access.md), [Self-hosting](../../design-decisions/self-hosting.md), [Protocol versions](../../design-decisions/protocol-versions.md)

## Summary

An app that's older or newer than its server keeps working on the device, never loses changes, and tells the user what to update. Updating the app moves its data and unsynced changes to the new version.

## Design intent

Apps update on their own schedule: app stores delay releases, people postpone updates, and self-hosted servers are updated whenever their admin gets to it (see [Self-hosting](../../design-decisions/self-hosting.md)). Without a plan, an app that falls behind either stops syncing for good or throws away changes. Attempts #1 to #3 never handled this.

Breaking changes require updating rather than the server translating old formats, because from v2 content is end-to-end encrypted and only devices can change it (see [End-to-end encryption](end-to-end-encryption.md)). So the device migrates its own data when it updates.

The rules follow Immich and Bitwarden (whose apps Vaultwarden serves), both self-hostable with apps updated through stores. Both keep breaking changes to major versions, so minor versions stay compatible. Immich's server accepts only its own major version, while its app supports the current and previous one. Bitwarden's apps check the server's version before using newer features, so older servers aren't sent formats they don't know, and that works with Bitwarden's end-to-end encryption. Immich before its stable 2.0 release (2025) shows the cost of frequent breaking changes: users were regularly stuck with apps their server refused.

## Rules

- Apps and servers each have a protocol version, `major.minor`: the version of the language they sync in. Apps send theirs with every sync request, and the server answers with its own.
- A minor version only adds things: new fields, record types or kinds of change. Changing or removing anything is a major version. Apps and servers with the same major version are compatible.
- An app that receives data it doesn't understand (from a newer minor version) stores it untouched, doesn't show it, and keeps syncing. Once updated, it applies that data without downloading anything again.
- An app newer than its server hides features the server's version doesn't support, so it never sends the server something it would refuse. The server stays strict: it accepts only what its own version knows.
- The server accepts only apps on its own major version. When the server's major version is newer than the app's, the server refuses the app's sync. The app keeps working on the device as if offline: changes are saved and queued, and a banner says to update the app to sync, with a way to update (the app store, the desktop app's updater, or reloading the web app).
- An app supports servers on its own major version and the previous one, so app-store updates don't strand users of self-hosted servers that haven't updated yet. On a server two or more major versions behind, the app says the server needs updating, naming the server, and keeps working on the device the same way.
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

### Newer app hides what the server lacks

- Given "alice"'s app is on a newer minor version that adds a field, and "tdl.example.com" is on the older one
- When she opens "Paint fence"
- Then the field isn't offered, and everything else syncs

### Newer app on a server one major version behind

- Given "alice"'s app is on major version 3, and "tdl.example.com" on major version 2
- When the app syncs
- Then it syncs, without the features version 2 lacks

### Server too old

- Given "tdl.example.com" runs a major version two or more behind "alice"'s app
- When the app syncs
- Then she is told tdl.example.com needs updating
- And her changes are saved on the device and queued

### Open web tab after a server update

- Given "alice" has the web app open with an unsynced change, and the server is updated to a new major version
- When the tab next syncs
- Then it offers to reload, and after reloading the change syncs

## Open questions

- **Migrating server-held data at a major change (v2, deferred).** With end-to-end encryption, only devices can rewrite content, so data on the server stays in the old format until a device migrates it. Options:
  - **The first updated device with access** rewrites and re-uploads each record.
  - **Lazily:** each record is migrated the next time it's edited.

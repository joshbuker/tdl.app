# Offline first

## Context

Mobile is a primary platform, and a todo app is often used with poor or no signal. #3 cached data for reading, but every change required a connection, and graph logic was computed separately in the browser and on the server. Sharing between users is also a launch requirement, so the same data is edited from several places.

## Decision

The app is **offline first**: every device keeps its own copy of the user's data, all changes are made locally first, and they sync with the server in the background. IDs are generated on the device.

## Alternatives considered

- **Online only**: simplest, but capture fails without signal.
- **Read-only offline** (#3): still blocks capture and editing offline.

## Consequences

- Domain logic, including the graph rules, must run on the device as well as the server. It should be one shared implementation, not two that drift apart like #3's.
- Sync and conflict resolution are core features with their own tests. Simple conflicts merge automatically, and conflicts without a clear answer go to the user (see [Offline use](../features/app/offline.md)).
- Graph rules are enforced in the order changes reach the server, so the graph is always valid there. Devices must be able to undo a local change the server rejected.
- The server keeps the full change history with no expiry, so a device can sync after any length of time offline. Storage grows with history, so compaction may be needed later.
- Stack choices (client storage, sync engine, ID scheme) must support this.

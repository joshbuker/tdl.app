# Protocol versions

## Context

Apps and servers update independently: app stores delay releases, people postpone updates, and self-hosted servers update when their admin does (see [Self-hosting](self-hosting.md)). Apps are offline first and hold unsynced changes (see [Offline first](offline-first.md)). From v2, content is end-to-end encrypted, so only devices can rewrite it (see [End-to-end encryption](end-to-end-encryption.md)).

## Decision

- The sync protocol has a `major.minor` version. Every sync request carries the app's, and every reply the server's. Federation uses the same version (see [Federation reuses sync](federation-reuses-sync.md)).
- **Minor versions only add.** Readers keep what they don't understand untouched and apply it once they're updated. Pulled data is checked leniently for unknown record types, fields and kinds of change, and strictly for everything the reader knows.
- **Major versions require updating**, on whichever side is older. The server doesn't translate old formats. Each updated device migrates its own data, including queued changes.
- **A version refusal is never a rejection.** Changes stay queued until the versions match, and the app keeps working on the device.

The behavior users see is in [Version compatibility](../features/app/version-compatibility.md).

## Alternatives considered

- **The server accepts the previous major version for a support period** (e.g. 12 months), translating old changes: fewer forced updates, but translation code on the server for every breaking change, and it can't work once content is encrypted.
- **Old apps skip data they don't understand and download everything again after updating:** simpler on the device, but a full re-download for large accounts.
- **Every new field is a major version:** no forward-compatibility code, but frequent forced updates.
- **Newer apps also speak the previous major version, for older self-hosted servers:** fewer stranded self-hosters, but every app carries old protocol code.

## Consequences

- Breaking changes are expensive (every user must update), so they should be rare, and additive changes preferred.
- Each device needs local migrations that also rewrite queued operations.
- Today's transport parses pulled pages strictly against fixed lists of record types and kinds, so one unknown entry stops sync. That parsing must become lenient for unknown entries before the first minor version ships.

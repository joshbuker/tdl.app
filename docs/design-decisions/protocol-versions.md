# Protocol versions

## Context

Apps and servers update independently: app stores delay releases, people postpone updates, and self-hosted servers update when their admin does (see [Self-hosting](self-hosting.md)). Apps are offline first and hold unsynced changes (see [Offline first](offline-first.md)). From v2, content is end-to-end encrypted, so only devices can rewrite it (see [End-to-end encryption](end-to-end-encryption.md)).

Immich and Bitwarden (whose apps also serve Vaultwarden) face the same problem: self-hostable servers, apps updated through stores, and in Bitwarden's case end-to-end encryption. Both keep breaking changes to major versions. Immich's server accepts only its own major version, and its app supports the current and previous one. Bitwarden's apps support servers up to two major versions apart, and check the server's version before using newer features, so older servers aren't sent formats they don't know.

## Decision

Follow Immich and Bitwarden:

- The sync protocol has a `major.minor` version. Every sync request carries the app's, and every reply the server's, in the `TDL-Protocol` header. The websocket, which browsers can't give headers, sends it in its `protocol` query parameter. The server refuses a version it doesn't accept with 426 `protocol-mismatch`. Federation and the public API use the same version (see [Federation reuses sync](federation-reuses-sync.md) and [API access](../features/app/api-access.md)).
- **Minor versions only add** fields, record types and kinds of change. Changing or removing anything is a major version.
- **Apps check the server's version** before using a feature, and hide what the server lacks, so the server can stay strict and refuse anything its version doesn't know.
- **Apps keep what they don't understand** (from a newer minor version) untouched, and apply it once updated. Pulled data is checked leniently for unknown record types, fields and kinds of change, and strictly for everything the app knows.
- **The server accepts only its own major version.** An older app must update. The server doesn't translate old formats.
- **Apps support the server's current and previous major version**, as Immich's do, so store updates don't strand users of self-hosted servers. Further behind, the app says the server needs updating.
- **Each updated device migrates its own data**, including queued changes.
- **A version refusal is never a rejection.** Changes stay queued until the versions are compatible, and the app keeps working on the device.

The behavior users see is in [Version compatibility](../features/app/version-compatibility.md).

## Alternatives considered

- **Every field change is a major version**, keeping the structure strict on both sides with no forward-compatibility code: every release that adds a field would strand apps until their stores approve the update, strand users of self-hosted servers until the admin updates, and break federation between servers until all are on the same version. Neither Immich nor Bitwarden does this, and Immich before 2.0 showed the cost of frequent breaking changes.
- **The server accepts the previous major version for a support period**, translating old changes: fewer forced app updates, but translation code on the server for every breaking change, and it can't work once content is encrypted.
- **Apps refuse older-major servers:** less code in the apps, but every major release strands self-hosters until their admin updates.
- **Old apps skip data they don't understand and download everything again after updating:** simpler on the device, but a full re-download for large accounts.
- **The server stores fields it doesn't know untouched:** it couldn't validate them. Unnecessary, since apps don't send what the server lacks.

## Consequences

- Breaking changes are expensive (every user must update), so they should be rare, and additive changes preferred.
- Each device needs local migrations that also rewrite queued operations.
- Apps carry the previous major version's protocol code, and must write that version's formats to an older server. From v2 this includes encrypted formats.
- Every feature in the apps needs a check of the server's version.
- Today's transport parses pulled pages strictly against fixed lists of record types and kinds, so one unknown entry stops sync. That parsing must become lenient for unknown entries before the first minor version ships.

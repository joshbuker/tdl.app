# Server-side sessions

## Context

#3 used server-side sessions that could be revoked, rather than self-contained tokens that stay valid until they expire. In attempt #4, apps are offline first and end-to-end encrypted, so each device stays logged in for a long time and holds the user's keys. A lost device must be cut off quickly.

## Decision

- Each logged-in device has its own session, stored on the server.
- A session lasts until the device logs out or the session is revoked. It has no fixed expiry while in use, and expires after 90 days without syncing.
- Settings list every logged-in device with when it last synced, and the user can revoke any of them, which logs it out and stops it syncing at once (see [Login](../features/account/login.md)).
- Changing the password revokes every other session (see [Change password](../features/account/change-password.md)).
- API tokens are separate, and are managed the same way (see [API access](../features/app/api-access.md)).

## Alternatives considered

- **Self-contained tokens (e.g. JWTs) with an expiry**: no session lookup, but can't be revoked before they expire without adding a server-side deny list, which is a session store anyway.
- **Fixed expiry** (e.g. 30 days): makes people log in again regularly, and offline devices would expire while away.

## Consequences

- Every sync request checks the session on the server.
- A revoked device keeps what it already synced, which is why revoking someone's access also changes keys for shared data (see [End-to-end encryption](end-to-end-encryption.md)).

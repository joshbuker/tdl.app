# Server-side sessions

## Context

#3 used server-side sessions that could be revoked, rather than self-contained tokens that stay valid until they expire. In attempt #4, apps are offline first, so each device stays logged in for a long time and holds a copy of the user's data (and from v2, their keys). A lost device must be cut off quickly.

## Decision

- Each logged-in device has its own session, stored on the server.
- The web app, served from the server's own origin, sends its session in an httpOnly cookie, which page scripts can't read. Android, Electron and other native clients send it as a bearer token, kept in the platform's secure storage. #3 used bearer tokens everywhere, held in the web app's JavaScript state.
- A session lasts until the device logs out or the session is revoked. It has no fixed expiry while in use, and expires after 90 days without syncing.
- Settings list every logged-in device with when it last synced, and the user can revoke any of them, which logs it out and stops it syncing at once (see [Login](../features/account/login.md)).
- Changing the password revokes every other session (see [Change password](../features/account/change-password.md)).
- API tokens are separate, and are managed the same way (see [API access](../features/app/api-access.md)).

## Alternatives considered

- **Self-contained tokens (e.g. JWTs) with an expiry**: no session lookup, but can't be revoked before they expire without adding a server-side deny list, which is a session store anyway.
- **Fixed expiry** (e.g. 30 days): makes people log in again regularly, and offline devices would expire while away.

## Consequences

- Every sync request checks the session on the server.
- A revoked device deletes its local data, including unsynced changes, the next time it reaches the server, since revoking is for lost or stolen devices. The app then drops its open copy and goes to the login page, so nothing edits the wiped data. A device that never reconnects keeps what it synced, which can't be prevented. A session that expires, or ends for any other reason, keeps the device's data and asks the user to log in again (see [Login](../features/account/login.md)). From v2, revoking someone's access also changes keys for shared data (see [End-to-end encryption](end-to-end-encryption.md)).

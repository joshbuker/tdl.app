# Federation reuses sync

## Context

Users on different servers must be able to share lists (see [Self-hosting](self-hosting.md) and [Federation](../features/app/federation.md)), and devices already sync with their server while offline first (see [Offline first](offline-first.md)).

## Decision

Servers federate with a **custom protocol that reuses device sync**. A collaborator's server syncs a shared list with the owner's server the way a device does. Servers sign requests with HTTP Message Signatures (RFC 9421), using a public key published at a well-known URL, and find users by address (`alice@tdl.example.com`) with WebFinger. Federation requires the same major protocol version on both servers.

## Alternatives considered

- **ActivityPub**: built for broadcasting posts to followers, not for editing shared data. It would need heavy extensions.
- **Matrix**: replicates shared rooms between servers, which is close to what's needed, but it is a large protocol whose data model would leak into ours.
- **Compatibility across major versions**: more flexible for self-hosters, but every feature would need a fallback for older servers.

## Consequences

- One sync mechanism to build and test, for devices and servers alike.
- Self-hosters must keep up with major versions to keep federating.

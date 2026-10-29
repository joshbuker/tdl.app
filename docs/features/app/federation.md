# Federation

Status: Proposed
Release: v1
Related: [Sharing](sharing.md), [Choose a server](../account/choose-server.md), [Self-hosting](../../design-decisions/self-hosting.md), [Offline use](offline.md)

## Summary

Users on different TDL App servers can share lists and work on them together, as if they were on the same server.

## Design intent

Self-hosting shouldn't mean isolation. Someone running their own server should still be able to share a list with a friend on the official server. Without federation, self-hosting forces a choice between owning your data and collaborating.

Federation reuses the device sync protocol from [Offline use](offline.md): a collaborator's server syncs a shared list with the owner's server the way a device does. ActivityPub was considered, but it is built for broadcasting posts, not for editing shared data, and Matrix would bring a large protocol and data model of its own. A custom protocol means one sync mechanism to build and test.

## Rules

- A user is identified across servers by their username plus their server's address (e.g. `alice@tdl.example.com`), and found with WebFinger.
- Servers talk over a custom protocol that reuses device sync. Each server publishes a public key at a well-known URL and signs its requests with HTTP Message Signatures (RFC 9421). Unsigned or wrongly signed requests are rejected.
- Federation only works between servers on the same major protocol version. A user inviting someone on an incompatible server is told why it failed.
- Everything in [Sharing](sharing.md) works the same between servers: invitations, roles, assignment, hidden blockers and ownership transfer.
- A shared list lives on its owner's server. Collaborators' servers keep a synced copy.
- When a remote server is unreachable, collaborators keep working on their copy, and changes sync once it's reachable again, as with [Offline use](offline.md).
- Server admins can turn federation off, or block specific servers.
- When a user on one server links their private task to a task in a list owned on another server, their server shares an opaque placeholder for each hidden task and link that touches the shared list: an ID, with no title or details. The owner's server uses the placeholders to show outline viewers the shape, and to detect loops only some users can see (see [Sharing](sharing.md)). What each user sees of those tasks depends on their access, as on a single server (see [Sharing](sharing.md)): the task as normal, a placeholder for outline viewers, or nothing.
- If the owner's server has been unreachable for 30 days, an editor can take over the list. It moves to their server with them as owner, and other collaborators follow it. If the old server comes back, its copy of the list becomes read-only, and the previous owner appears as a request for access, which the new owner approves or declines. Nothing changes without the new owner's approval.

## Scenarios

### Share with a user on another server

- Given "alice" on `tdl.example.com` owns the list "House"
- When she invites `bob@tdl.app` as an editor and he accepts
- Then "bob" sees "House" in his app on `tdl.app` and can edit its tasks

### Remote server unreachable

- Given "bob" on `tdl.app` edits a task in "House", owned on `tdl.example.com`
- And `tdl.example.com` is unreachable
- Then "bob"'s change is kept and syncs when `tdl.example.com` is reachable again

### Blocked server

- Given the admin of `tdl.app` has blocked `spam.example.com`
- When a user on `spam.example.com` invites a user on `tdl.app`
- Then the invitation is not delivered

### Incompatible versions

- Given `tdl.example.com` and `tdl.app` run different major protocol versions
- When "alice" invites `bob@tdl.app`
- Then the invitation fails, and "alice" is told the servers are incompatible

### Editor takes over a lost list

- Given "House" is owned on `tdl.example.com`, which has been unreachable for 30 days
- When `bob@tdl.app`, an editor, takes over "House"
- Then "House" lives on `tdl.app` with "bob" as owner

### Old owner returns

- Given "bob" took over "House" after `tdl.example.com` was unreachable for 30 days
- When `tdl.example.com` comes back
- Then "alice" appears to "bob" as a request for access to "House"
- And "alice" has no access until "bob" approves

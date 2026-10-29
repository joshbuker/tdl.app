# Federation

Status: Proposed
Release: v1
Related: [Sharing](sharing.md), [Choose a server](../account/choose-server.md), [Self-hosting](../../design-decisions/self-hosting.md), [Offline use](offline.md)

## Summary

Users on different TDL App servers can share lists and work on them together, as if they were on the same server.

## Design intent

Self-hosting shouldn't mean isolation. Someone running their own server should still be able to share a list with a friend on the official server. Without federation, self-hosting forces a choice between owning your data and collaborating.

## Rules

- A user is identified across servers by their username plus their server's address (e.g. `alice@tdl.example.com`).
- Everything in [Sharing](sharing.md) works the same between servers: invitations, roles, assignment, hidden blockers and ownership transfer.
- A shared list lives on its owner's server. Collaborators' servers keep a synced copy.
- When a remote server is unreachable, collaborators keep working on their copy, and changes sync once it's reachable again, as with [Offline use](offline.md).
- Server admins can turn federation off, or block specific servers.

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

## Open questions

- Which server-to-server protocol: an existing one such as ActivityPub, or a custom one?
- How do servers verify each other's identity?
- How are servers on different versions handled?
- How do hidden blockers work across servers, given a server can't see another server's private tasks?
- What happens to a shared list if its owner's server shuts down permanently?

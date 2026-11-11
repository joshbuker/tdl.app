# Launch scope

## Context

Every v1 spec was planned for launch, including four platforms, offline-first editing, sharing across servers and many graph tools. The size of v1 decides how soon the app can be used day to day.

## Decision

v1 is for the author plus a few people (family or friends): good enough to replace Todoist day to day, with basic sharing between them.

- **In v1:** web, Android, iOS and desktop; offline-first editing and sync; sharing on one server; and every spec marked `Release: v1`.
- **Moved to v2:** federation, user-resolved sync conflicts and notes text merging, request access, languages other than English, Focus, Quick sort, Insert between, Move requisites, Prune redundant links, Triage review and Slice task. Statuses and the Board view were already deferred (see [Completion before statuses](completion-before-statuses.md)).

On invite-only servers, admins bring people in with sign-up invite links and email invites until request access arrives in v2 (see [Sign up](../features/account/sign-up.md)).

The 2026 devlog lists auto-scheduling as one of five core features. It stays in v2, as the first thing after launch.

Deferred features must still fit without a redesign: IDs and the sync protocol must be able to carry federation, and sync keeps full change history from day one.

## Alternatives considered

- **Only the author, on the web** (as an installable app): smallest, but the author wants all four platforms and a few other users from the start.
- **Public launch**: needs request access, more languages and more polish before anyone can use it.
- **Online only**: much simpler, but offline-first would be a near rewrite to add later.

## Consequences

- The stack choice still has to cover four platforms, offline sync and sharing.
- When v1 ships, v2 becomes the target and the deferred specs are reconsidered (see [Features](../features/README.md)).

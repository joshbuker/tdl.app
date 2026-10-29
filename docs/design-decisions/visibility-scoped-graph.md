# Visibility-scoped graph

## Context

Links can cross list boundaries, so a task in a shared list can depend on a task in a list some collaborators can't see (see [Sharing](../features/app/sharing.md)). Earlier drafts showed such links as "blocked by a task you can't see". That still reveals that hidden tasks exist, and private data should leak nothing.

## Decision

What a user sees of the graph, and what the graph rules consider for them, depends on their access to each list:

- **Viewer or above**: tasks and links as normal.
- **Outline viewer**: placeholders showing that tasks exist, how they link and whether each is complete, without titles or details. Like free/busy in a shared calendar.
- **No access**: no sign at all.

Next up, blocked indicators, the cycle and redundancy checks, rejection messages and task history are all worked out per user from what that user can see. The same applies between servers (see [Federation](../features/app/federation.md)), where servers exchange opaque placeholders behind the scenes.

## Alternatives considered

- **"Blocked by a task you can't see"**: keeps one global answer for next up and the graph rules, but reveals hidden tasks.
- **No links across visibility boundaries**: no leak, but stops someone linking their own private work to a shared task.

## Consequences

- Graph logic takes a viewer as input. It isn't a single global computation.
- A link that is valid from one user's view can close a loop only another user sees. How that is handled is an open question in [Sharing](../features/app/sharing.md).

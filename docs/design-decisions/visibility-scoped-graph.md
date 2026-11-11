# Visibility-scoped graph

## Context

Links can cross list and user boundaries, so a shared task can depend on a task some of the people it's shared with can't see (see [Sharing](../features/app/sharing.md)). Earlier drafts showed such links as "blocked by a task you can't see". That still reveals that hidden tasks exist, and private data should leak nothing.

## Decision

What a user sees of the graph, and what the graph rules consider for them, depends on their access to each task, through its list or a direct grant (see [Container and item grants](container-and-item-grants.md)):

- **Viewer or above**: tasks and links as normal.
- **Outline** (v2): placeholders showing that tasks exist, how they link and whether each is complete, without titles or details. Like free/busy in a shared calendar.
- **No access**: no sign at all.

Next up, blocked indicators, the cycle and redundancy checks, rejection messages, task history, and every value derived from the graph (implied deadlines and prioritize dates, the Blocks sorts, progress counts, graph node sizes and dependency order) are all worked out per user from what that user can see. The same applies between servers (see [Federation](../features/app/federation.md)), where servers exchange opaque placeholders behind the scenes.

## Alternatives considered

- **"Blocked by a task you can't see"**: keeps one global answer for next up and the graph rules, but reveals hidden tasks.
- **No links across visibility boundaries**: no leak, but stops someone linking their own private work to a shared task.

## Consequences

- Graph logic takes a viewer as input. It isn't a single global computation.
- A link that is valid from one user's view can close a loop only another user sees. The link is allowed, and the loop is flagged to each user who can see all of it, who fixes it by removing a link (see [Sharing](../features/app/sharing.md)). Rejecting the link would reveal hidden tasks, and automatically suspending a link would change someone's plan behind their back.
- While a flagged loop exists, values derived from the graph treat the loop's links as absent: its tasks stay blocked by each other for next up, but dependency order, tree roots, and implied deadlines and prioritize dates don't follow the loop's links.
- Loops are detected on each user's own device from what that user can see, so no server needs to know the structure of anyone else's private tasks.

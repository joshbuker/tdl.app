# Soft dependencies

Status: Proposed
Release: v1
Related: [Link tasks](link-tasks.md), [Next up](next-up.md), [Filtering and sorting](../views/filtering-and-sorting.md)

## Summary

A link can be soft ("I'd like to do this first") rather than hard ("this must be done first"). Soft links order tasks but never block them.

## Design intent

Planned since Slipstream: "Have a distinction between hard pre/post requisites and soft (this MUST be done, vs I would LIKE this to be done before/after). Automatically drop stale soft requirements over time?" #3's relationship table was built with types to allow this (`TaskHardRequisite` was the only type), but soft links were never implemented.

Here, hard and soft are an attribute of the one link between two tasks, not separate kinds of relationship. Soft links share one graph with hard links, and the graph rules treat every link the same, so ordering stays well defined and the rules stay simple. Switching a link between hard and soft is meant to be quick. They never expire on their own, because nothing in the graph changes without the user asking (see [Prune redundant links](prune-redundant-links.md)).

## Rules

- Every link is either hard or soft. New links are hard unless the user chooses soft.
- The user can switch a link between hard and soft in one action, from either task. Switching never changes the shape of the graph, so it is always allowed.
- A soft prerequisite never blocks: a task whose only incomplete prerequisites are soft is next up (see [Next up](next-up.md)).
- Soft prerequisites still order tasks: in [dependency order](../views/filtering-and-sorting.md), a task comes after its incomplete soft prerequisites.
- A task shows its incomplete soft prerequisites as a hint (e.g. "ideally after Buy paint").
- Completing a task with incomplete soft prerequisites gives no warning.
- Hard and soft links form one graph for the cycle and redundancy rules, which ignore whether a link is hard or soft. A link that would create a cycle, or that duplicates an existing path, is rejected whatever mix of hard and soft links is involved.
- Soft links never expire automatically.

## Scenarios

### Soft prerequisite doesn't block

- Given "Buy paint" is a soft prerequisite of "Paint fence", both incomplete
- Then "Paint fence" is next up

### Soft prerequisite orders dependency order

- Given "Buy paint" is a soft prerequisite of "Paint fence", both incomplete
- When the user sorts by dependency order
- Then "Buy paint" appears before "Paint fence"

### Soft links can't create cycles

- Given "A" is a hard prerequisite of "B"
- When the user adds "B" as a soft prerequisite of "A"
- Then the link is rejected with a message explaining it would create a cycle

### Redundancy ignores hard and soft

- Given "A" soft before "B", and "B" soft before "C"
- When the user adds "A" as a hard prerequisite of "C"
- Then the link is rejected as redundant
- And the user can instead remove the soft links or make them hard

### Switch a link to soft

- Given "Buy paint" is a hard prerequisite of "Paint fence"
- When the user makes the link soft
- Then "Paint fence" is next up

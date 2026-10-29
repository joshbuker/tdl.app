# Soft dependencies

Status: Proposed
Related: [Link tasks](link-tasks.md), [Next up](next-up.md), [Agenda](../views/agenda.md)

## Summary

A link can be soft ("I'd like to do this first") rather than hard ("this must be done first"). Soft links order tasks but never block them.

## Design intent

Planned since Slipstream: "Have a distinction between hard pre/post requisites and soft (this MUST be done, vs I would LIKE this to be done before/after). Automatically drop stale soft requirements over time?" #3's relationship table was built with types to allow this (`TaskHardRequisite` was the only type), but soft links were never implemented.

Here, hard and soft are an attribute of the one link between two tasks, not separate kinds of relationship. Soft links share one graph with hard links, so ordering stays well defined. They never expire on their own, because nothing in the graph changes without the user asking (see [Prune redundant links](prune-redundant-links.md)).

## Rules

- Every link is either hard or soft. New links are hard unless the user chooses soft, and a link can be switched between the two.
- A soft prerequisite never blocks: a task whose only incomplete prerequisites are soft is next up (see [Next up](next-up.md)).
- Soft prerequisites still order tasks: in [Agenda](../views/agenda.md) order, a task comes after its incomplete soft prerequisites.
- A task shows its incomplete soft prerequisites as a hint (e.g. "ideally after Buy paint").
- Completing a task with incomplete soft prerequisites gives no warning.
- Hard and soft links form one graph for the cycle rule: a link that would create a cycle through any mix of hard and soft links is rejected.
- For the redundancy rule, an existing path makes a new link redundant only if it is at least as strong: a soft link is redundant over any path, and a hard link only over a path of hard links.
- Soft links never expire automatically.

## Scenarios

### Soft prerequisite doesn't block

- Given "Buy paint" is a soft prerequisite of "Paint fence", both incomplete
- Then "Paint fence" is next up

### Soft prerequisite orders the agenda

- Given "Buy paint" is a soft prerequisite of "Paint fence", both incomplete
- When the user selects the Agenda preset
- Then "Buy paint" appears before "Paint fence"

### Soft links can't create cycles

- Given "A" is a hard prerequisite of "B"
- When the user adds "B" as a soft prerequisite of "A"
- Then the link is rejected with a message explaining it would create a cycle

### Hard link over a soft path is allowed

- Given "A" soft before "B", and "B" soft before "C"
- When the user adds "A" as a hard prerequisite of "C"
- Then the link is added

### Switch a link to soft

- Given "Buy paint" is a hard prerequisite of "Paint fence"
- When the user makes the link soft
- Then "Paint fence" is next up

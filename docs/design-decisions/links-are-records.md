# Links are records

## Context

The dependency graph is the core model (see [Dependency graph with dates](dependency-graph-with-dates.md)), and a link between two tasks carries information of its own: whether it is hard or soft (see [Soft dependencies](../features/dependencies/soft-dependencies.md)), and why it exists. More link attributes are likely later.

Every attempt stored links in their own table: #1 and #2 had `rules` (`pre_id`, `post_id`), and #3 had `task_relationships` (`first_id`, `second_id`, a `type` column with `TaskHardRequisite` as its only value, and `notes`).

## Decision

A link is a **record of its own** (a join model with its own table), not a field or list on a task.

- There is **one** link model. "Prerequisite" and "postrequisite" are the two ends of the same record, seen from each task, not two models or two stored copies.
- Each link record holds: the prerequisite task, the postrequisite task, whether it is **hard or soft**, an optional **reason** describing why it exists, and its own timestamps.
- A pair of tasks has at most one link, in one direction. Hard vs soft is an attribute of that link, not a separate link.
- Domain rules (no self links, no cycles, no redundant links, recurring tasks can't be linked) validate link records, and live in the framework-independent domain logic.

## Alternatives considered

- **Array of prerequisite IDs on each task**: no place for per-link metadata, and the graph rules would have to scan every task.
- **Separate models or tables for hard and soft links** (or for prerequisites and postrequisites): duplicates the rules, and allows a pair of tasks to be linked twice in conflicting ways.
- **#3's single-table inheritance on `type`**: works, but makes hard vs soft a change of class rather than an attribute, so switching a link between them is a delete and re-create.

## Consequences

- New link attributes are new fields on the link record, with no change to tasks.
- Links sync, are shared and are exported as records in their own right (see [Offline](../features/app/offline.md) and [Import and export](../features/app/import-export.md)). With device-generated IDs, a link has its own ID.
- Editing a link's reason or hardness is an edit to the link, not to either task.

# Agenda

Status: Proposed
Release: v1
Related: [Next up](../dependencies/next-up.md), [Filtering and sorting](filtering-and-sorting.md)

## Summary

A sort order, and a preset using it: tasks in an order where dependencies always come first, and among available tasks, the ones blocking the most work come first.

## Design intent

Built in #3 as its own page. It answers "if I work top to bottom, what order makes sense?" It is a topological sort weighted by how many tasks each one blocks. #3 later started moving it into the sidebar as a preset, and that is the model here: Agenda is a sort that any page (List, Focus, and so on) can use, plus an "Agenda" preset that applies it.

## Rules

- A task never appears before any of its incomplete prerequisites, hard or soft (see [Soft dependencies](../dependencies/soft-dependencies.md)).
- Among tasks whose prerequisites are all listed already, the one with the most incomplete hard postrequisites comes first.
- Ties are broken by earliest effective deadline (see [Deadlines](../scheduling/deadlines.md)), then by tasks flagged as high priority by a passed [prioritize date](../scheduling/prioritize-date.md), then by oldest creation time.
- The Agenda preset shows incomplete tasks in agenda order.

## Scenarios

### Dependencies come first

- Given "A" before "B" and an unrelated task "C"
- When the user selects the Agenda preset
- Then "A" appears before "B"

### Most-blocking first

- Given next-up tasks "A" blocking 3 tasks and "C" blocking none
- When the user selects the Agenda preset
- Then "A" appears before "C"

## Open questions

- Should scheduled dates affect the order?

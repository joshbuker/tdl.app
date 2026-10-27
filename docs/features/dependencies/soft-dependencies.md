# Soft dependencies

Status: Proposed
Related: [Link tasks](link-tasks.md), [Next up](next-up.md)

## Summary

A link can be soft ("I'd like to do this first") rather than hard ("this must be done first").

## Design intent

Planned since Slipstream: "Have a distinction between hard pre/post requisites and soft (this MUST be done, vs I would LIKE this to be done before/after). Automatically drop stale soft requirements over time?" #3's relationship table was built with types to allow this (`TaskHardRequisite` was the only type). Never implemented.

## Rules

- To be defined.

## Scenarios

- To be defined.

## Open questions

- Does a soft prerequisite block next up, or only affect ordering (e.g. in the agenda)?
- Should stale soft links expire automatically, and after how long?
- Do the cycle and redundancy rules apply across hard and soft links together?

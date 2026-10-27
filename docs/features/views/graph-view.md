# Graph view

Status: Proposed
Related: [Tree view](tree-view.md)

## Summary

The dependency graph drawn as nodes and arrows that the user can pan, zoom and click.

## Design intent

Partly built in #3 as a force-directed graph. Nodes were sized by how many tasks they block and colored by state (completed, next up, blocked), so bottlenecks stood out.

## Rules

- Arrows point from prerequisite to postrequisite.
- Node size reflects how many incomplete tasks it blocks.
- Completed, next-up and blocked tasks look different.
- Clicking a node opens the task.

## Scenarios

- To be defined.

## Open questions

- Is this useful day to day, or mainly a visualization?

# Graph view

Status: Proposed
Release: v1
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
- The graph is for viewing, not editing. Links are made in task details and [Quick sort](../dependencies/quick-sort.md).

## Scenarios

### Open a task from the graph

- Given "A" before "B"
- When the user clicks "B" in the graph
- Then "B" opens

### Bottlenecks stand out

- Given "A" blocks 5 tasks and "C" blocks none
- Then "A" is drawn larger than "C"

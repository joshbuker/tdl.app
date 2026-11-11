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
- Dragging from one node to another makes the first a prerequisite of the second. The same rules apply as anywhere else, and rejections are explained (see [Link tasks](../dependencies/link-tasks.md)).
- Redundant links are hidden by default. A toggle shows them, marked as redundant.

## Scenarios

### Open a task from the graph

- Given "A" before "B"
- When the user clicks "B" in the graph
- Then "B" opens

### Bottlenecks stand out

- Given "A" blocks 5 tasks and "C" blocks none
- Then "A" is drawn larger than "C"

### Link by dragging

- Given "Buy paint" and "Paint fence" are shown and not linked
- When the user drags from "Buy paint" to "Paint fence"
- Then "Buy paint" is a prerequisite of "Paint fence"

### Dragging follows the link rules

- Given "A" before "B"
- When the user drags from "B" to "A"
- Then no link is made, and the user is told it would create a cycle

### Show redundant links

- Given "A" before "B" before "C", and a redundant link "A" before "C"
- Then the "A" to "C" link is not drawn
- And when the user turns on redundant links, it is drawn, marked as redundant

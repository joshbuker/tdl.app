# Tree view

Status: Proposed
Related: [Link tasks](../dependencies/link-tasks.md)

## Summary

The dependency graph shown as an expandable tree: next-up tasks at the root, with their postrequisites underneath.

## Design intent

In #1 and #3. Because the graph is not a tree, a task with several prerequisites appears under each of them. #3 also allowed reversing the tree (starting from final goals, expanding into prerequisites) and remembered which branches were expanded.

## Rules

- Roots are tasks with no incomplete prerequisites.
- Expanding a task shows its postrequisites.
- A task with several prerequisites appears under each.
- Reversed: roots are tasks with no incomplete postrequisites, and expanding shows prerequisites.
- Expanded branches are remembered.

## Scenarios

### Expand a task

- Given "A" before "B"
- When the user expands "A"
- Then "B" is shown under "A"

### Reverse the tree

- Given "A" before "B"
- When the user reverses the tree
- Then "B" is a root and "A" is under it

## Open questions

- Should completed tasks be shown?

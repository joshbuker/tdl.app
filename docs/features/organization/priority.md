# Priority

Status: Proposed
Release: v1
Related: [Prioritize date](../scheduling/prioritize-date.md), [Filtering and sorting](../views/filtering-and-sorting.md), [Natural-language entry](../tasks/natural-language-entry.md)

## Summary

A task can have a manual priority from p1 (highest) to p4 (lowest), shown by color.

## Design intent

#1 and #2 had priorities, and earlier notes (Todoist features we like, the Backlog, Kurt's feature list) all wanted Todoist-style p1 to p4. Computed signals (prioritize date, deadlines, how many tasks a task blocks) say what is urgent, but not what the user simply cares about more.

Priority is optional, and "not set" is different from p4, so a task the user hasn't judged yet isn't mistaken for a low-priority one (from the Backlog's "not set vs none"). If everything is p1, nothing is, so priority is a sort and filter, not something that blocks or reorders the graph.

## Rules

- A task's priority is p1, p2, p3, p4, or not set. New tasks have no priority set.
- Each level has its own color, shown on the task. Tasks with no priority set show none.
- Priority can be typed as `p1` to `p4` in a new task's title (see [Natural-language entry](../tasks/natural-language-entry.md)).
- Tasks can be filtered and sorted by priority. When sorting, tasks with no priority set come after p4.
- Priority is the same for everyone with access to the task (see [Sharing](../app/sharing.md)).
- Priority is separate from the computed "High priority" flag of a passed [prioritize date](../scheduling/prioritize-date.md). Neither changes the other.

## Scenarios

### Set a priority

- When the user creates "Call plumber p1"
- Then "Call plumber" has priority p1 and shows its color

### No priority by default

- When the user creates "Buy milk"
- Then "Buy milk" has no priority set

### Sort by priority

- Given "A" is p2, "B" has no priority, and "C" is p1
- When the user sorts by priority
- Then the order is "C", "A", "B"

### Filter by priority

- Given "A" is p1 and "B" is p3
- When the user filters for p1
- Then only "A" is shown

# Quick sort

Status: Proposed
Release: v1
Related: [Link tasks](link-tasks.md), [Next up](next-up.md)

## Summary

The app shows two (or a few) next-up tasks and asks "which comes first?" The chosen one becomes a prerequisite of the others.

## Design intent

Builds the graph through quick comparisons instead of manual linking. It goes back to Slipstream's "Boggle": "pick 2 tasks that don't depend on each other; let the user make one the pre of the other, or skip." #3 built it as "Quick Arrange Next Actions", optionally opening automatically when too many tasks are next up. It was off by default.

## Rules

- Only next-up tasks that don't depend on each other are compared.
- Choosing one makes it a prerequisite of the others shown.
- The user can skip a comparison.
- "Do this ASAP" makes a task a prerequisite of all other next-up tasks.
- Sorting stops when the number of next-up tasks reaches a target (default 1).
- Each comparison shows 2 tasks by default, configurable up to 10.
- Quick sort is started by the user. It opens automatically only if the user turns that on, when next up exceeds the target.

## Scenarios

### Choose which comes first

- Given next-up tasks "A" and "B"
- When the user chooses "A"
- Then "A" is a prerequisite of "B"
- And only "A" is next up

### Skip

- When the user skips a comparison
- Then no links change and a different pair is shown

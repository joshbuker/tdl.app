# Prioritize date

Status: Proposed
Release: v1
Related: [Deadlines](deadlines.md), [Schedule](schedule.md)

## Summary

A task can have a prioritize date. Once it passes, the task is flagged as high priority.

## Design intent

From #2, where a task showed a "high priority" icon once its prioritize date passed. It marks the point where a task should start getting attention, which can be well before its deadline and independent of when it's scheduled.

## Rules

- A task's implied prioritize date is the earliest effective prioritize date among the incomplete tasks it blocks through hard links, directly or through other tasks, since those tasks can't move until it is done. It is computed from the graph, not stored.
- A task's effective prioritize date is the earlier of its own prioritize date and its implied one.
- An incomplete task whose effective prioritize date has passed is flagged as high priority.
- Tasks can be sorted by whether they are flagged (see [Filtering and sorting](../views/filtering-and-sorting.md)).

## Scenarios

### Flag after the prioritize date

- Given an incomplete task with a prioritize date of yesterday
- Then it is flagged as high priority

### Prioritize date passes to prerequisites

- Given "A" is a prerequisite of "B", and "B" has a prioritize date of yesterday
- Then "A" is flagged as high priority

## Open questions

- Should the flag affect presets (e.g. Today)?

# Deadlines

Status: Proposed
Release: v1
Related: [Schedule](schedule.md), [Prioritize date](prioritize-date.md), [Agenda](../views/agenda.md)

## Summary

A task can have a deadline: when it must be done by. Overdue tasks are highlighted, and prerequisites inherit an implied deadline from the tasks they block.

## Design intent

Separates "when to do it" ([Schedule](schedule.md)) from "when it must be done by". #1 added a deadline field but never used it. #2 showed an overdue icon when the deadline passed.

In a dependency graph, a deadline on a task is effectively a deadline on everything it waits for. Showing that implied deadline on prerequisites makes the risk visible while there's still time to act on it.

## Rules

- An incomplete task past its deadline is shown as overdue.
- A task's implied deadline is the latest time it can finish and still leave room for the incomplete tasks it blocks: for each task it directly blocks, that task's effective deadline minus its duration, and the earliest of those. Tasks without a duration count as zero. It is computed from the graph, not stored.
- A task's effective deadline is the earlier of its own deadline and its implied deadline.
- Effective deadlines break ties in [Agenda](../views/agenda.md) order.

## Scenarios

### Implied deadline subtracts durations

- Given "A" is a prerequisite of "B", "B" takes 2 days, and "B" is due Friday
- Then "A" has an implied deadline of Wednesday

### Overdue task is highlighted

- Given an incomplete task with a deadline of yesterday
- Then it is shown as overdue

### Prerequisites inherit an implied deadline

- Given "Buy paint" before "Paint fence", and "Paint fence" is due Friday
- Then "Buy paint" shows an implied deadline of Friday

### Earlier own deadline wins

- Given "Buy paint" is due Wednesday and blocks "Paint fence", due Friday
- Then "Buy paint" shows Wednesday as its deadline

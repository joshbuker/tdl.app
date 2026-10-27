# Recurring tasks

Status: Proposed
Related: [Routines](../organization/routines.md), [Schedule](schedule.md)

## Summary

A task can repeat. When completed, it comes back at its next occurrence.

## Design intent

Never built, but planned repeatedly. #3 had pending tests: "should allow setting a recurring task with NLP", "should properly increment a recurring task marked complete", and setting recurrence from the title or due date, at a specific time of day. Slipstream planned "permanent loops": cyclic chains (A, B, C, D, then A again) where completing one flags the next.

## Rules

- A task can recur on a fixed schedule ("every Monday at 9", "the 1st of every month") or at an interval after completion ("2 weeks after I finish it").
- Completing a recurring task brings it back at its next occurrence.
- Recurrence can be typed in natural language, in a new task's title or in a date field, as well as set with a picker (see [Natural-language entry](../tasks/natural-language-entry.md)).

## Scenarios

### Fixed schedule

- Given "Take out trash" recurs every Monday
- When the user completes it on Monday
- Then it is scheduled for the following Monday

### Interval after completion

- Given "Get a haircut" recurs 4 weeks after completion
- When the user completes it on March 10
- Then it is scheduled for April 7

### Natural-language entry

- When the user creates a task titled "Water plants every Monday at 9am"
- Then the task is titled "Water plants" and recurs every Monday at 09:00

## Open questions

- How do recurring tasks fit in the dependency graph, given links can't form cycles? Options:
  - Each occurrence is fresh: completing it creates or reveals the next occurrence with the same links, so links never loop back.
  - Recurring tasks can't be linked: they stay outside the graph.
  - Slipstream's "permanent loops": a special loop link type (A, B, C, then A again) where completing one flags the next, exempt from the cycle rule.
- How do recurring tasks relate to [Routines](../organization/routines.md)? Options:
  - Routines can recur: a routine with a recurrence resets on schedule, and single recurring tasks stay separate.
  - Merge them into one feature: a recurring item that may be one task or several.
  - Keep them separate: routines are only reset manually.

# Schedule

Status: Proposed
Related: [Dependency graph with dates](../../design-decisions/dependency-graph-with-dates.md), [Deadlines](deadlines.md), [Auto-scheduler](auto-scheduler.md), [Calendar view](../views/calendar-view.md)

## Summary

A task can be scheduled with a date, a time and a duration, each optional and in any combination.

## Design intent

Tasks are planned at different levels of precision: "sometime Thursday" (date), "takes about 2 hours" (duration), "Thursday at 3pm" (date and time), "2 hours on Thursday" (date and duration), or "Thursday 3pm to 5pm" (all three). #1 to #3 used a single date-time, which forced a time onto tasks that didn't have one. Duration also feeds the [Auto-scheduler](auto-scheduler.md).

The schedule says when the user intends to do a task. Views such as Today or Upcoming are filters over it (see [Filtering and sorting](../views/filtering-and-sorting.md)). #1's fixed Today / Tomorrow / Upcoming / Someday columns are not carried forward.

## Rules

- A task's date, time and duration are each optional, and can be set in any combination, except that a time needs a date. A time without a date is only allowed on a [recurring task](recurring-tasks.md) (e.g. "every day at 9") or as part of a time range for the [Auto-scheduler](auto-scheduler.md).
- Dates are interpreted in the user's time zone.
- A scheduled date in the past is a missed plan, not overdue. "Overdue" applies only to [Deadlines](deadlines.md). Missed tasks stay in Today, showing the date they were scheduled for.
- Changing one part of the schedule keeps the others.
- Dates, times and durations can be typed in natural language, in a new task's title or in the schedule field, as well as set with pickers (see [Natural-language entry](../tasks/natural-language-entry.md)).

## Scenarios

### Schedule a date only

- When the user schedules "Call plumber" for Thursday
- Then "Call plumber" shows Thursday and no time

### Duration without a date

- When the user gives "Write report" a duration of 2 hours
- Then "Write report" shows its duration and has no date

### Time needs a date

- Given "Call plumber" has no date and does not repeat
- When the user tries to give it a time of 09:00 only
- Then the time is not saved and the user is asked for a date

### Date, time and duration

- When the user schedules "Dentist" for Thursday at 15:00 for 1 hour
- Then "Dentist" shows Thursday 15:00 to 16:00

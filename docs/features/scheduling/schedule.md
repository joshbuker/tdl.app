# Schedule

Status: Specified
Release: v1
Related: [Dependency graph with dates](../../design-decisions/dependency-graph-with-dates.md), [Floating dates, zoned times](../../design-decisions/floating-dates-zoned-times.md), [Deadlines](deadlines.md), [Auto-scheduler](auto-scheduler.md), [Calendar view](../views/calendar-view.md)

## Summary

A task can be scheduled with a date, a time and a duration, each optional and in any combination.

## Design intent

Tasks are planned at different levels of precision: "sometime Thursday" (date), "takes about 2 hours" (duration), "Thursday at 3pm" (date and time), "2 hours on Thursday" (date and duration), or "Thursday 3pm to 5pm" (all three). #1 to #3 used a single date-time, which forced a time onto tasks that didn't have one. Duration also feeds the [Auto-scheduler](auto-scheduler.md).

The schedule says when the user intends to do a task. Views such as Today or Upcoming are filters over it (see [Filtering and sorting](../views/filtering-and-sorting.md)). #1's fixed Today / Tomorrow / Upcoming / Someday columns are not carried forward.

## Rules

- A task's date, time and duration are each optional, and can be set in any combination, except that a time needs a date. A time without a date is only allowed on a [recurring task](recurring-tasks.md) (e.g. "every day at 9") or as part of a time window for the [Auto-scheduler](auto-scheduler.md).
- A date without a time is a calendar date (e.g. 2026-11-17), the same for everyone with access, and shown with its day of the week. It counts as today when it is today in the viewer's time zone. A date with a time records the time zone it was set in, and is shown in each viewer's own time zone (see [Floating dates, zoned times](../../design-decisions/floating-dates-zoned-times.md)).
- A scheduled date in the past is a missed plan, not overdue. "Overdue" applies only to [Deadlines](deadlines.md). Missed tasks stay in Today while they are next up, showing the date they were scheduled for.
- Changing one part of the schedule keeps the others.
- A task can be scheduled earlier than one of its prerequisites. Both dates are kept, and the task shows a warning that a prerequisite is scheduled after it.
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

### Changing one part keeps the others

- Given "Dentist" is scheduled for Thursday at 15:00 for 1 hour
- When the user changes the date to Friday
- Then "Dentist" shows Friday 15:00 to 16:00

### Missed plan stays in Today

- Given "Call plumber" was scheduled for yesterday and is incomplete
- Then it is shown in Today with yesterday's date
- And it is not marked overdue

### A date is the same date for everyone

- Given "alice" in Tokyo and "bob" in New York can both see "Call plumber"
- When "alice" schedules it for Thursday 2026-11-19
- Then both see it scheduled for Thursday 2026-11-19
- And it is in each one's Today on that date in their own time zone

### Times are shown in each viewer's time zone

- Given "alice" in Tokyo and "bob" in New York can both see "Team call"
- When "alice" schedules it for Thursday 2026-11-19 at 15:00
- Then "alice" sees Thursday 15:00
- And "bob" sees Thursday 01:00

### Scheduled before a prerequisite

- Given "Buy paint" is a prerequisite of "Paint fence"
- And "Buy paint" is scheduled for Wednesday
- When the user schedules "Paint fence" for Monday
- Then "Paint fence" is scheduled for Monday
- And it shows a warning that "Buy paint" is scheduled after it

# Auto-scheduler

Status: Proposed
Release: v2
Related: [Schedule](schedule.md), [Calendar view](../views/calendar-view.md)

## Summary

The app places tasks on the calendar, and moves them as needed, based on their duration, the days and hours they can happen in, dependencies, priority and deadlines.

## Design intent

The user gives a task a duration and, optionally, a date range it should happen within ("2 hours, sometime this week"). The scheduler picks the exact time and reschedules automatically when things change, like Motion or Reclaim, instead of the user doing it by hand. Tasks with a fixed time are pinned, so the user stays in control of anything that must happen at a set time.

Many tasks can only happen at certain hours: work tasks during working hours (9am to 5pm), errands while a store is open, calls while the other person is awake. Rather than set this on every task, the user defines named **time windows** once (e.g. "Work hours", "Hardware store hours") and attaches them to tasks. A task's date range ("sometime this week") says which days it can happen on, and its time window says which hours on those days.

This builds on the independent date, time and duration in [Schedule](schedule.md). #3 mentioned it in passing (a utility kept "for auto scheduler features") and had a task duration field.

## Rules

- The scheduler places incomplete tasks that have a duration but no fixed time.
- A task can have a date range it should happen within (e.g. "this week", or "between the 3rd and the 10th").
- The user can define named time windows: a weekly set of hours, e.g. "Work hours" = Monday to Friday, 09:00 to 17:00, or "Hardware store" = Monday to Saturday 08:00 to 18:00, Sunday 10:00 to 16:00. Each day can have several ranges, or none.
- A task can have a time window. It is placed only inside that window, within its date range if it has one. A task without a time window can be placed in any of the user's available time.
- A task is placed entirely inside one stretch of its window, never split across it (e.g. a 2-hour store trip isn't started 30 minutes before closing).
- A task with a fixed date and time is pinned: the scheduler never moves it. The user can also pin any scheduled task.
- A task is never placed before the planned end of its incomplete hard prerequisites.
- A task with a deadline (including an implied deadline) is placed to finish before it when possible. When it can't be, the task is flagged as at risk.
- Earlier deadlines and higher priority are placed first.
- The scheduler moves unpinned tasks automatically when something changes, e.g. a task overruns, a new task is added, or a prerequisite slips.

## Scenarios

### Place a task with a duration

- Given "Write report" takes 2 hours, sometime this week, and the user has free time on Tuesday morning
- When the scheduler runs
- Then "Write report" is scheduled for 2 hours on Tuesday morning

### Fit a task into its time window

- Given a time window "Hardware store" of Monday to Saturday, 08:00 to 18:00
- And "Buy screws" takes 30 minutes, has the "Hardware store" window, and is due by Sunday
- When the scheduler runs on Saturday at 17:45
- Then "Buy screws" is not placed on Saturday or Sunday, and is flagged as at risk

### Work tasks stay in work hours

- Given a time window "Work hours" of Monday to Friday, 09:00 to 17:00
- And "Write report" takes 2 hours and has the "Work hours" window
- When the scheduler runs on Friday at 16:00
- Then "Write report" is placed on Monday from 09:00 to 11:00

### Fixed tasks are pinned

- Given "Dentist" is scheduled for Tuesday at 10:00
- When the scheduler runs
- Then "Dentist" is still on Tuesday at 10:00

### Prerequisites come first

- Given "Draft" (1 hour) is a hard prerequisite of "Review" (1 hour)
- When the scheduler runs
- Then "Review" is placed after "Draft" ends

### Reschedule when a task can't fit

- Given "Write report" was placed on Tuesday morning, and a pinned meeting is added at that time
- When the scheduler runs
- Then "Write report" is moved to the next free time in its range

## Open questions

- Can a list or tag have a default time window (e.g. every task in "Work" uses "Work hours")?
- Can a task have more than one time window (e.g. either of two stores)?
- Should windows support exceptions such as holidays or one-off closures?
- Can a time window be shared with a list's collaborators (see [Sharing](../app/sharing.md))?

- What counts as available time: working hours set by the user, events on connected calendars, or both?
- How is the user told that tasks were moved (e.g. a daily summary, or a notice per change)?
- Do soft prerequisites affect placement (see [Soft dependencies](../dependencies/soft-dependencies.md))?

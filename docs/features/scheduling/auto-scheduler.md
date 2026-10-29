# Auto-scheduler

Status: Proposed
Release: v2
Related: [Agenda](../views/agenda.md), [Calendar view](../views/calendar-view.md)

## Summary

The app places tasks on the calendar, and moves them as needed, based on their duration, the time range they can happen in, dependencies, priority and deadlines.

## Design intent

The user gives a task a duration and, optionally, a time range it should happen within ("2 hours, sometime this week"). The scheduler picks the exact time and reschedules automatically when things change, like Motion or Reclaim, instead of the user doing it by hand. Tasks with a fixed time are pinned, so the user stays in control of anything that must happen at a set time. This builds on the independent date, time and duration in [Schedule](schedule.md). #3 mentioned it in passing (a utility kept "for auto scheduler features") and had a task duration field.

## Rules

- The scheduler places incomplete tasks that have a duration but no fixed time, within their time range if they have one.
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

- What counts as available time: working hours set by the user, events on connected calendars, or both?
- How is the user told that tasks were moved (e.g. a daily summary, or a notice per change)?
- Do soft prerequisites affect placement (see [Soft dependencies](../dependencies/soft-dependencies.md))?

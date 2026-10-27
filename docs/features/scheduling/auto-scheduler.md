# Auto-scheduler

Status: Proposed
Related: [Agenda](../views/agenda.md), [Calendar view](../views/calendar-view.md)

## Summary

The app places tasks on the calendar, and moves them as needed, based on their duration, the time range they can happen in, dependencies, priority and deadlines.

## Design intent

The user gives a task a duration and, optionally, a time range it should happen within ("2 hours, sometime this week"). The scheduler picks the exact time and reschedules when things change, instead of the user doing it by hand. This builds on the independent date, time and duration in [Schedule](schedule.md). #3 mentioned it in passing (a utility kept "for auto scheduler features") and had a task duration field.

## Rules

- To be defined.

## Scenarios

- To be defined.

## Open questions

- What counts as available time (working hours, existing calendar events)?
- Does the scheduler move tasks automatically, or propose changes for the user to accept?
- Are tasks with a fixed date and time ever moved?
- Should energy levels affect placement (see [Energy levels](../tasks/energy-levels.md))?

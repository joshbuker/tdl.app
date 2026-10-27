# Calendar view

Status: Proposed
Related: [Schedule](../scheduling/schedule.md), [Deadlines](../scheduling/deadlines.md), [Auto-scheduler](../scheduling/auto-scheduler.md)

## Summary

Tasks shown on a calendar at their scheduled date and their deadline. Dragging reschedules them.

## Design intent

A placeholder tab in #1 and a stub page in #3 ("Calendar goes here", with a note to consider FullCalendar). Never built. With independent dates, times and durations (see [Schedule](../scheduling/schedule.md)), the calendar is where a plan is seen and adjusted, and it is the natural home for the [Auto-scheduler](../scheduling/auto-scheduler.md).

## Rules

- A task appears on its scheduled date. With a time it appears at that time, and with a duration as a block of that length.
- A task with a deadline also appears on its deadline date, marked as a deadline.
- When a task's scheduled date and deadline fall on the same day, it appears once, showing both.
- Dragging a task's deadline moves the deadline. Dragging the task anywhere else moves its schedule.
- Reminders are not shown.

## Scenarios

### Scheduled task with a time and duration

- Given "Dentist" is scheduled for Thursday 15:00 for 1 hour
- Then it appears on Thursday as a block from 15:00 to 16:00

### Schedule and deadline on different days

- Given "File taxes" is scheduled for Monday with a deadline of Friday
- Then it appears on Monday, and as a deadline on Friday

### Same day combines

- Given "File taxes" is scheduled for Friday with a deadline of Friday
- Then it appears once on Friday, showing both

### Drag the deadline

- Given "File taxes" has a deadline of Friday
- When the user drags its deadline to Thursday
- Then its deadline is Thursday and its schedule is unchanged

### Drag to reschedule

- Given "Call plumber" is scheduled for Monday
- When the user drags it to Tuesday
- Then it is scheduled for Tuesday

## Open questions

- Should implied deadlines appear too?
- Day, week and month views?

# Natural-language entry

Status: Proposed
Related: [Create a task](create-task.md), [Schedule](../scheduling/schedule.md), [Deadlines](../scheduling/deadlines.md), [Recurring tasks](../scheduling/recurring-tasks.md), [Reminders](../scheduling/reminders.md)

## Summary

The user can type details in plain language instead of using pickers, both in a new task's title ("Call plumber tomorrow at 3pm #Home @phone") and in any date field ("every Monday at 9", "in 2 weeks").

## Design intent

Modeled on Todoist's quick add, so capture stays a single line of typing. #3 had pending tests for natural-language recurrence that were never implemented. Parsed parts are highlighted as the user types, so it's clear what will be pulled out of the title before the task is saved.

## Rules

- When creating a task, these are recognized in the title and removed from it:
  - dates, times and durations, which set the [Schedule](../scheduling/schedule.md);
  - recurrence (e.g. "every Monday"), which sets [Recurring tasks](../scheduling/recurring-tasks.md);
  - a list, written `#List`;
  - tags, written `@tag`;
  - a deadline, written `{date}`;
  - reminders, written `!time`.
- The symbols above (`#`, `@`, `{}`, `!`) are placeholders, to be finalized during implementation.
- Recognized parts are highlighted while typing, before the task is saved.
- Every date field (schedule, deadline, prioritize date, reminders) accepts the same natural-language dates and recurrence when edited.
- Text that isn't recognized stays in the title.
- A `#List` or `@tag` that doesn't exist is offered as a suggestion to create it. It is only created if the user chooses that; otherwise it stays in the title.
- Clicking a highlighted part dismisses it, leaving that text in the title as typed.
- Parsing supports English at launch. Other languages come after launch.

## Scenarios

### Parse a new task's title

- Given the user has a list "Home" and a tag "phone"
- When the user creates "Call plumber tomorrow at 3pm #Home @phone"
- Then the task is titled "Call plumber", scheduled for tomorrow at 15:00, in "Home", tagged "phone"

### Recurring date in a date field

- Given a task "Water plants"
- When the user types "every Monday at 9am" into its schedule
- Then it recurs every Monday at 09:00

### New list needs confirmation

- Given the user has no list "Garage"
- When the user types "Sweep floor #Garage"
- Then creating the list "Garage" is offered
- And the list is created only if the user chooses it

### Dismiss a recognized part

- When the user types "Read Tomorrow and Tomorrow" and clicks the highlighted "Tomorrow"
- Then the task is titled "Read Tomorrow and Tomorrow" with no schedule

### Deadline in the title

- When the user creates "File taxes {April 15}"
- Then the task is titled "File taxes" with a deadline of April 15

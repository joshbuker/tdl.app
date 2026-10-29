# Filtering and sorting

Status: Proposed
Related: [Dependency graph with dates](../../design-decisions/dependency-graph-with-dates.md)

## Summary

Every page shows the same tasks through a chosen filter and sort. The user picks a preset (All Tasks, Inbox, Today, Upcoming, Agenda, or a list) or combines filters and sorts.

## Design intent

From #3's design notes: views are "modeled based on a presentation layer", using "filters/setting toggles for manipulating the data". Filtering and sorting should be modular and combinable, "using lower ranked sorting options as the tiebreaker for higher sorting options. Similar to Airtable." Planned presets were Inbox, Today, Upcoming, Agenda and By list. Planned sorts were by date, by priority and by name. Only some were built.

## Rules

- Pages are List, Board, Focus, Tree, Graph and Calendar. Any preset can be used with any page.
- Presets:
  - **All Tasks**: every task.
  - **Inbox**: the user's default list, where new tasks land (see [Lists](../organization/lists.md)).
  - **Today**: incomplete tasks scheduled for today or earlier. Unscheduled tasks are not included. A task scheduled for an earlier day shows that date.
  - **Upcoming**: tasks scheduled after today, in date order.
  - **Agenda**: incomplete tasks in [agenda](agenda.md) order.
  - One preset per list.
- Filters combine (e.g. a list and a tag at the same time).
- Tasks can be filtered by status category (To do, In progress, Done) across lists, or by a specific status within one list (see [Statuses](../organization/statuses.md)).
- Tasks can be filtered by assignee (including "assigned to me") and by participant (see [Assignment](../organization/assignment.md)).
- Sorts combine, with each later sort breaking ties in the ones before it.
- Completed tasks can be shown or hidden.
- Blocked tasks can be shown or hidden.

## Scenarios

### Combine a list and a tag

- Given tasks in several lists and tags
- When the user selects the list "Home" and the tag @Weekend
- Then only tasks in "Home" tagged @Weekend are shown

### Today shows missed plans

- Given "Call plumber" was scheduled for yesterday and is incomplete
- And "Buy milk" has no schedule
- When the user selects Today
- Then "Call plumber" is shown, noting yesterday's date
- And "Buy milk" is not shown

### Tiebreak sorting

- Given two tasks with the same priority and different titles
- When sorted by priority, then by title
- Then the two are shown in title order

## Open questions

- Can users save their own presets?

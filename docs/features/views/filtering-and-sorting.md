# Filtering and sorting

Status: Proposed
Release: v1
Related: [Dependency graph with dates](../../design-decisions/dependency-graph-with-dates.md), [Pages and presets](../../design-decisions/pages-and-presets.md)

## Summary

Every page shows the same tasks through a chosen filter and sort. The user picks a preset (All Tasks, Inbox, Today, Upcoming, a list, or one they saved) or combines filters and sorts.

## Design intent

From #3's design notes: views are "modeled based on a presentation layer", using "filters/setting toggles for manipulating the data". Filtering and sorting should be modular and combinable, "using lower ranked sorting options as the tiebreaker for higher sorting options. Similar to Airtable." Planned presets were Inbox, Today, Upcoming, Agenda and By list. Planned sorts were by date, by priority and by name. Only some were built.

#3 also had an Agenda page answering "if I work top to bottom, what order makes sense?": prerequisites first, then the task blocking the most work, then the earliest deadline. Every part of it is now an ordinary sort, so it needs no page or preset of its own. The one part a field sort can't express is "prerequisites come first", which is why dependency order is a sort option.

When tasks from several lists are shown together, each one shows its list, so the user can tell them apart without grouping by list. This follows Todoist, which shows each task's project on the task itself in views that span projects. #2's task rows had a list chip in the code, but it was commented out, and only tag chips were shown. #3's task rows showed only a count of incomplete postrequisites.

## Rules

- Pages are List, Board, Focus, Tree, Graph and Calendar. Any preset can be used with any page.
- When the tasks shown span several lists, each task shows its list (icon and name) as a chip, on every page.
- Presets:
  - **All Tasks**: every task.
  - **Inbox**: the user's default list, where new tasks land (see [Lists](../organization/lists.md)).
  - **Today**: incomplete tasks scheduled for today or earlier, plus incomplete tasks flagged as high priority (see [Prioritize date](../scheduling/prioritize-date.md)). Other unscheduled tasks are not included. A task scheduled for an earlier day shows that date.
  - **Upcoming**: tasks scheduled after today, in date order.
  - One preset per list.
- The user can save any combination of filters and sorts as a named preset of their own, shown alongside the built-in ones. Saved presets can be renamed, reordered and deleted.
- Filters combine (e.g. a list and a tag at the same time).
- Tasks can be filtered by status category (To do, In progress, Done) across lists, or by a specific status within one list (see [Statuses](../organization/statuses.md)).
- Tasks can be filtered by assignee (including "assigned to me") and by participant (see [Assignment](../organization/assignment.md)).
- Sorts combine, with each later sort breaking ties in the ones before it.
- Tasks can be sorted by their own fields (e.g. title, schedule, deadline, prioritize date, status, creation time) and by computed fields:
  - **Blocks**: how many incomplete tasks it blocks through hard links, directly or through other tasks.
  - **Effective deadline**: the earlier of its deadline and its implied deadline (see [Deadlines](../scheduling/deadlines.md)).
  - **High priority**: whether its [prioritize date](../scheduling/prioritize-date.md) has passed.
- **Dependency order** is a sort in which a task never comes before its incomplete prerequisites, hard or soft (see [Soft dependencies](../dependencies/soft-dependencies.md)). Among tasks whose prerequisites are already placed, the sorts after it decide the order.
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

### Save a preset

- Given the user has filtered for the tag @Errands and sorted by deadline
- When the user saves this as "Errands by deadline"
- Then "Errands by deadline" appears among their presets and shows the same tasks in the same order

### Dependency order puts prerequisites first

- Given "A" before "B", and an unrelated task "C"
- When the user sorts by dependency order, then by title descending
- Then "A" appears before "B"

### Most-blocking first

- Given next-up tasks "A" blocking 3 tasks and "C" blocking none
- When the user sorts by dependency order, then by blocks
- Then "A" appears before "C"

### Tiebreak sorting

- Given two tasks with the same priority and different titles
- When sorted by priority, then by title
- Then the two are shown in title order

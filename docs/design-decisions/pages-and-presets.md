# Pages and presets

## Context

#3's design notes: "we decided to model each [page] based on a presentation layer, and use filters/setting toggles for manipulating the data (e.g. show a specific list of tasks, or layer zero, etc)." It renamed `/tasks` to `/list` because "all pages deal with tasks, so calling it Tasks is redundant." #1 instead built its main page around fixed date columns (Today, Tomorrow, Upcoming, Someday), which tied one way of filtering to one way of presenting.

## Decision

Separate **how** tasks are shown from **which** tasks are shown:

- **Pages** are presentation layers: List, Board, Focus, Tree, Graph, Calendar.
- **Presets** are named filter and sort combinations: All Tasks, Inbox, Today, Upcoming, one per list, and any the user saves.
- Any preset works with any page.

#3's Agenda is neither a page nor a preset: its ordering is built from ordinary sorts, including a dependency-order sort (see [Filtering and sorting](../features/views/filtering-and-sorting.md)). This goes further than where #3 was heading.

## Alternatives considered

- **A page per purpose** (#3's early Agenda page, #1's date columns): duplicates filtering logic per page, and each page supports only its own filter.
- **Fixed date columns** (#1): dropped along with the Today / Tomorrow / Upcoming / Someday grouping.

## Consequences

- Filtering and sorting are domain logic shared by every page, so they are unit tested once.
- Adding a page or a preset doesn't require changes to the other.

# Dependency graph with dates

## Context

Every attempt changed the core organizing model:

- **#1 and #2**: date buckets (Today, Tomorrow, Upcoming, Someday) driven by a single "review at" date, with pre/post requisites as a secondary blocker.
- **#3 (Dec 2021 to Apr 2023)**: a full GTD model (inbox, next actions, projects, contexts, waiting-fors). It was migrated in and then back out. Most of that work was thrown away.
- **#3 (2023 to 2024)**: the dependency graph became the backbone (layer zero, agenda, focus, quick sort, tree, graph). Date-based views were reduced to stubs.

Dependencies are the one idea present in every attempt, including the earlier "Slipstream" app. Dates kept coming back as the way to answer "what should I look at today?"

## Decision

The **task dependency graph** is the core model. A task's prerequisites must be done before it, and "next up" (incomplete tasks with no incomplete prerequisites) is the default set of actionable work.

**Dates are layered on top** for scheduling: when to look at a task, when it is due, and when to be reminded. Date-based views filter and sort the graph's actionable tasks; they don't replace the graph.

## Alternatives considered

- **Dependency graph only** (late #3): no good answer to "what's for today?", and the planned Today/Upcoming views never got built.
- **Date buckets first** (#1, #2): blocked tasks clutter date views, and the graph was an afterthought.
- **Full GTD model** (early #3): heavy, prescriptive, and was reverted. Useful GTD ideas (inbox, contexts, energy, delegation) can come back as individual features without making GTD the model.

## Consequences

- Graph rules (no cycles, no redundant links, completed tasks stop blocking) are core domain logic and get the most thorough unit tests.
- Every view is a filter and sort over the same task set. See `docs/features/views/filtering-and-sorting.md`.

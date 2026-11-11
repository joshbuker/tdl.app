# Completion before statuses

## Context

[Statuses](../features/organization/statuses.md) were specified for v1 to support Jira-style workflow lists and a [Board view](../features/views/board-view.md), with completion as one of a list's statuses. That adds per-list status sets, categories, simple and workflow lists, and status filters to the first release. #3 added statuses partly to cover GTD's "waiting for", kept a separate completed flag alongside them, and never built a UI for them.

## Decision

In v1 a task is either complete or incomplete, with its completion time recorded. Statuses and the Board view move to v2, and may not be built at all.

The dependency graph already shows much of what statuses would: next-up tasks are what can be worked on, and their assignee shows who is on them. "Waiting for" in GTD means waiting on a person, which an assignee (including free text) or a context tag covers. Waiting on a task is being blocked by a prerequisite.

## Alternatives considered

- **Statuses in v1** (earlier #4 drafts): richer tracking from launch, but a lot of model and UI for a need the graph may already meet.
- **A completed flag alongside statuses** (#3): two fields that can disagree.

## Consequences

- If statuses are added later, completion becomes part of a task's status, as the Statuses spec describes. Existing completed and incomplete tasks map to each list's default complete and incomplete statuses.
- Revisit after launch, once it's clear whether next up and assignment are enough to see what's in progress.

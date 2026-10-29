# Features

The source of truth for what TDL App does and why. Each feature is specified here before it is built, and each scenario is backed by an acceptance test.

## Layout

One file per feature, grouped by area: `docs/features/<area>/<feature>.md` (e.g. `tasks/create-task.md`).

## Status

- **Proposed**: intent and behavior still being worked out.
- **Specified**: scenarios agreed, ready for acceptance tests.
- **Implemented**: all scenarios' acceptance tests pass.

## Release

Each spec says which release it belongs to:

- **v1**: needed at launch.
- **v2**: after launch.

A single rule that comes later than the rest of its spec ends with "(v2)", e.g. support for more languages in a v1 feature. When a release ships, the next one becomes the target, so add v3 only when something is planned beyond v2.

Specs are evergreen. When behavior changes, edit the spec in place. When a feature is removed, delete its spec and tests. Git holds the history.

## Writing a spec

- **Intent comes first.** It tells a reader which trade-offs are acceptable when details change, and it is the hardest thing to recover later.
- **Rules** are the business rules the feature enforces. Each one gets unit tests.
- **Scenarios** describe what the user does and sees, not implementation details like tables, endpoints, or components. Each scenario is one acceptance test with a matching name.

## Template

```markdown
# <Feature name>

Status: Proposed | Specified | Implemented
Release: v1 | v2
Related: <links to features or design decisions>

## Summary

What the user can do, in one or two sentences.

## Design intent

Why it exists, what problem it solves, and what it deliberately doesn't do.
Note anything tried in `historical-versions/` and why it changed.

## Rules

- <rule>

## Scenarios

### <Scenario name>

- Given <starting state>
- When <user action>
- Then <observable outcome>

## Open questions

- <anything undecided>
```

# Design Decisions

What we chose, what we chose it over, and why, so developers and AI agents understand the current design and don't undo a choice without knowing what it protects.

## When to write one

When a choice:

- picks a tool, library, pattern, or convention over reasonable alternatives (including a framework default, if someone might ask "why not X?");
- would surprise someone reading the code;
- pins a dependency version or works around a limitation. Say when the pin can be lifted.

## Format

One file per decision, named `short-title.md`. Records are evergreen: they describe the decision as it stands now.

- **Decision changes:** edit the record in place, and move the old approach into "Alternatives considered" with why it was dropped.
- **Decision no longer applies:** delete the record.

Git holds the history.

```markdown
# <Title>

## Context

The problem and the forces at play.

## Decision

What we chose.

## Alternatives considered

- **<Option>**: why not.

## Consequences

What this makes easier or harder, and any follow-up (e.g. when to revisit).
```

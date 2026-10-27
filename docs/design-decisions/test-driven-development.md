# Test-driven development

## Context

Attempt #3 got fairly far, but its frontend components and backend logic were hard to decouple, which made unit testing difficult. Attempt #2 was partly abandoned over untested "cowboy code". Across all attempts, features were never written down with their intent, so each rewrite had to rediscover it.

## Decision

Build test-first: write a failing test, make it pass, refactor (red, green, refactor). This applies at two levels:

- **Unit tests** drive the business logic: domain models, validation, task relationships, filtering and sorting. That logic lives in plain, framework-independent code that the UI and API call into, so it can be tested quickly and in isolation.
- **Acceptance tests** drive features. They exercise the whole app end to end, the way a user would.

### Behavior-driven development

The acceptance level follows behavior-driven development (BDD): tests come from a written description of the behavior, not from the code. Every feature is specified in `docs/features/` before it is built:

- its **design intent** (why it exists and what trade-offs are acceptable);
- its **rules**, each backed by unit tests;
- its **scenarios** in Given/When/Then form, each backed by one acceptance test with a matching name.

Scenarios are written in terms of what the user does and sees. That keeps them readable by anyone and stable through refactors.

### Workflow

1. Write or update the feature spec.
2. Write failing acceptance tests for its scenarios.
3. Drive out the implementation with failing unit tests, one rule at a time.
4. Make the acceptance tests pass, then refactor with the suite green.

## Alternatives considered

- **Tests written after implementation**: lets coupling creep in unnoticed, which is what attempt #3 ran into.
- **Unit tests only**: doesn't prove features work end to end.
- **Acceptance tests only**: slow, and failures don't point to the broken rule.
- **TDD without written specs**: tests pin down behavior but not why it exists, so the intent gets lost again between rewrites.

## Consequences

- Behavior changes start with a spec change, so specs and acceptance tests stay in sync.
- Every stack decision must allow domain logic to be separate from UI and transport layers.
- Test tooling (runners, whether to execute Gherkin directly) is decided separately once the stack is chosen.

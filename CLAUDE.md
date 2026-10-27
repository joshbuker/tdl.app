# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

TDL App (https://tdl.app) is a todo/task-management app, now on **attempt #4**. No application code or tech stack exists yet.

- `docs/features/`: one spec per feature. This is the source of truth for behavior.
- `docs/design-decisions/`: one evergreen record per decision.
- `docs/open-items.md`: cross-cutting open questions, next steps and stack constraints. Check it at the start of a session.
- `docs/lessons-from-previous-attempts.md`: bugs and pitfalls from attempts #1 to #3 to avoid.
- `historical-versions/`: the three previous attempts, imported with `git subtree`. This is **read-only reference**; don't modify it unless asked.

## Workflow

Follow `docs/design-decisions/test-driven-development.md`:

1. Write or update the spec in `docs/features/` first (template in its README). Don't implement behavior that no spec describes.
2. Write a failing acceptance test per scenario, with the test name matching the scenario name.
3. Drive out business logic with failing unit tests. Keep that logic in framework-independent modules, not in UI components or request handlers.
4. Mark the spec `Implemented` when all of its scenarios pass.

When a change makes or reverses a significant choice, update `docs/design-decisions/` in the same change (format in its README). Check there before changing an established pattern.

Specs and decision records are evergreen: edit them in place, delete them when they no longer apply, and rely on Git for history.

When resolving open questions with the user, ask in small batches of multiple-choice questions, each with a recommendation and what earlier attempts did. Apply answers to the docs after each batch. If an answer defers a choice, record it as an open question listing every option.

## Historical versions

Timeline and reasons for each rewrite are in `historical-versions/README.md`:

- **#1:** `rails.legacy.tdl.app`, a Rails monolith with inline Vue. It was web-only.
- **#2:** `historical-api.tdl.app` + `historical-web.tdl.app` (Rails API + Quasar v1).
- **#3:** `api.tdl.app` + `web.tdl.app` (Rails API + Quasar v2). Frontend and backend logic were hard to decouple for unit testing.

Attempt #3 is the most useful reference:

- **`api.tdl.app`** (Rails, Postgres, Ruby 3):
  - Domain models are in `app/models/`. Tasks form a dependency graph, and its rules (acyclic, non-redundant, same-user, and so on) live in `app/validators/`.
  - Authorization uses Pundit policies in `app/policies/`.
  - OpenAPI docs come from rswag, and tests are in RSpec.
- **`web.tdl.app`** (Quasar v2, Vue 3, TypeScript):
  - State lives in Pinia/pinia-orm stores under `src/stores/`, one per resource.
  - Pages are named by presentation layer (`/list`, `/calendar`, `/tree`, `/graph`) over the same task data.
  - Conventions are in `docs/DESIGN_DECISIONS.md`.
  - Tests use Vitest and Cypress; `yarn test:everything` runs the full suite.

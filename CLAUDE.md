# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

TDL App (https://tdl.app) is a todo/task-management app, now on **attempt #4**. The stack is chosen (TypeScript everywhere; see `docs/design-decisions/`), but no application code exists yet. The first code is the thin slice, built from the plans in `docs/superpowers/plans/`. Develop inside `nix-shell` (see `docs/design-decisions/nix-dev-shell.md`), and install nothing globally.

- `docs/features/`: one spec per feature. This is the source of truth for behavior.
- `docs/design-decisions/`: one evergreen record per decision.
- `docs/open-items.md`: cross-cutting open questions, next steps and stack constraints. Check it at the start of a session.
- `docs/superpowers/specs/` and `docs/superpowers/plans/`: designs and implementation plans for larger pieces of work, such as the thin slice.
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

- **Asking:**
  - Explain any jargon in plain terms before asking about it.
  - Word "keep" vs "defer" questions so the direction is unmistakable.
  - Don't re-ask a question the user has already answered. If a clear directive has a tricky consequence, apply the directive and record the consequence as an open question listing the options.
- **Answers:**
  - Read free-text answers carefully: they often defer a choice, refine an option, or add a requirement.
  - When gathering ideas from a source, capture all of them in the docs before triaging any.
  - Commit at natural checkpoints, so nothing is lost between sessions.

When evaluating libraries, tools or services:

- Research the current state fresh: look for the latest and best-regarded options, rather than anchoring on names already mentioned. Consider categories beyond the obvious one (e.g. graph and document databases, not just SQL).
- Find candidates in more than one place. Use at least two differently worded web searches, the package registry's own search (e.g. `npm search`), and the alternatives that official docs or curated lists name. One search's results are never the whole field.
- Check every candidate the same way:
  - **Licence:** rule out anything that fails the licence rules in `docs/design-decisions/licence-and-pricing.md`.
  - **Adoption:** weekly downloads, dependent packages, GitHub stars and contributors.
  - **Maintenance and stability:** first and latest release dates, how often it releases, whether it's past 1.0, open issues and whether they get answers, archived or deprecated status, support for the versions we use, and how many people maintain it. A mature library can be quiet without being unmaintained; unanswered issues and stale support for current platforms are the warning signs.
  - **Security:** known vulnerabilities (GitHub advisories, OSV), install scripts and native code, how many dependencies it pulls in, and signs of a sketchy package: very new with few users, a name close to a popular package, a recent change of owner, or code that's minified or obfuscated for no reason. For anything that handles secrets, authentication or encryption, read how it does it.
- Avoid options that are barely used (roughly under 1,000 weekly downloads, or under a year old), unmaintained, or sketchy, even when they otherwise fit. If nothing better exists, say so and name the risk.
- Show every candidate side by side in one table before recommending. Anything named as the choice or as an alternative, in conversation or in the docs, comes from that table. For npm packages, `pnpm stats:packages <package>...` prints it, with warnings (see `docs/design-decisions/dependency-safety.md`).

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

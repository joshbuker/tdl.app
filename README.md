# TDL App

[tdl.app](https://tdl.app)

This is attempt #4 at building TDL App, built test-first from the outset:

- **Features are specified before they are built.** Specs in [`docs/features/`](docs/features/) give each feature's design intent, rules, and Given/When/Then scenarios.
- **Acceptance tests** exercise each scenario end to end.
- **Unit tests** cover the business logic, which is kept independent of the UI.

## Documentation

- [`docs/features/`](docs/features/): what the app does and why. This is the source of truth for behavior.
- [`docs/design-decisions/`](docs/design-decisions/): what we chose, what we chose it over, and why. Start with [test-driven development](docs/design-decisions/test-driven-development.md).
- [`historical-versions/`](historical-versions/): previous attempts, with full codebases.

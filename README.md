# TDL App

[tdl.app](https://tdl.app)

## Why

Everyone has things to do and priorities to juggle. Most todo apps don't model the one thing needed to capture everything and sort it properly: that some tasks have to wait for others. The few that do are tied to one platform or limited, and nearly all of them hold your data, which says a lot about you.

The goal is "mind like water": always knowing what to work on now, and trusting that nothing is forgotten.

## Core features

- **Next up, automatically.** Tasks link as prerequisites and postrequisites, and the app shows what can be done now and what is blocked.
- **Low friction.** Capturing a task and finding what to do next take as little effort as possible.
- **Private.** Data is end-to-end encrypted, and the server can be self-hosted.
- **Works with assistants.** Voice and AI assistants can manage tasks through an MCP server.
- **Scheduling.** Tasks are planned by date, time and duration, with auto-scheduling and time blocking (e.g. work tasks only in work hours) planned right after launch.

## How it's built

This is attempt #4 at building TDL App, built test-first from the outset:

- **Features are specified before they are built.** Specs in [`docs/features/`](docs/features/) give each feature's design intent, rules, and Given/When/Then scenarios.
- **Acceptance tests** exercise each scenario end to end.
- **Unit tests** cover the business logic, which is kept independent of the UI.

## Documentation

- [`docs/features/`](docs/features/): what the app does and why. This is the source of truth for behavior.
- [`docs/design-decisions/`](docs/design-decisions/): what we chose, what we chose it over, and why. Start with [test-driven development](docs/design-decisions/test-driven-development.md).
- [`docs/open-items.md`](docs/open-items.md): cross-cutting questions and next steps.
- [`docs/lessons-from-previous-attempts.md`](docs/lessons-from-previous-attempts.md): pitfalls from earlier attempts to avoid.
- [`historical-versions/`](historical-versions/): previous attempts, with full codebases.

# Vue and Quasar

## Context

The UI is a thin layer over plain TypeScript domain packages (see [TypeScript everywhere](typescript-everywhere.md) and [Test-driven development](test-driven-development.md)). It ships on the web, Android and iOS through Capacitor, and on desktop through Electron (see [Electron desktop app](electron-desktop.md)). #1 to #3 all used Vue, and #2 and #3 used Quasar, so the author knows both well. The app will be built largely with AI coding agents.

## Decision

The UI is written in **Vue 3** with the **Quasar 2** component library.

- Domain logic stays out of components (see [Test-driven development](test-driven-development.md)). Components read from the device's store and call domain functions.
- Views that need specialist libraries use framework-independent or fully free ones (e.g. d3 for the graph, as in #3), checked against the licence rules in [Licence and pricing](licence-and-pricing.md).
- Vue's Vapor mode (no virtual DOM) can be adopted per component once it's stable, where list performance needs it.

## Alternatives considered

- **React**: the largest ecosystem and the most training data for AI agents, but the author would learn it from scratch. In late-2026 comparisons the only measured advantage for agents was on single components, not whole apps, and an agent benchmark across 12 stacks put Vue (Nuxt) within the margin of error of the best.
- **Svelte 5**: lean and fast, but a smaller ecosystem and another framework to learn.
- **Ionic Vue**: the most native feel on phones, but new to this project, with fewer desktop-style components.
- **Nuxt UI or Reka UI**: modern and fully free, but making them feel native on phones would be up to us.

## Consequences

- Little to learn before building features.
- Quasar's Material styling feels less native on iOS than Ionic.
- #3's components got tangled with its logic. That was an architecture problem rather than a Quasar one, and is addressed by keeping logic in domain packages.

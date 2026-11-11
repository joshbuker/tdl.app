# Electron desktop app

## Context

The app ships on Windows, macOS and Linux as well as the web, Android and iOS (see [Platforms](../features/app/platforms.md)). The desktop app has to:

- store data in SQLite (see [Custom sync](custom-sync.md));
- schedule reminders as local notifications (see [Reminders](../features/scheduling/reminders.md));
- run the MCP server locally (see [MCP server](../features/app/mcp-server.md)).

The mobile apps are the web app wrapped with Capacitor through Quasar's Capacitor mode (see [Vue and Quasar](vue-and-quasar.md)). #2 and #3 wrapped the same codebase with Electron through Quasar, but never customized the desktop app.

## Decision

The desktop app is the web app wrapped with **Electron**, built with **Quasar's Electron mode**. Native features on desktop (SQLite, local notifications, the MCP server) run in Electron's Node process, and the app reaches them through a small, typed IPC layer of our own (messages between the window and the Node process). Each native feature has one TypeScript interface, implemented by a Capacitor plugin on mobile and by the IPC layer on desktop.

## Alternatives considered

- **Capawesome's Capacitor Electron bridge** (MIT, released July 2026): desktop would reuse Capacitor plugins, but Quasar doesn't document or orchestrate it (three build steps by hand and a third package tree), and it was unconfirmed whether the plugins we need have Electron implementations.
- **Tauri 2**: smaller installers and lower memory use, because it uses the operating system's own browser engine. But it adds a Rust layer to a [TypeScript-only codebase](typescript-everywhere.md), the MCP server would be a separate Node binary (a sidecar), pages can render differently on each operating system, and its mobile support was still immature.
- **`@capacitor-community/electron`**: the older bridge, unmaintained since 2023.

## Consequences

- One build command per platform, all through Quasar's CLI.
- Larger installers and memory use than a native or Tauri app.
- Desktop-only implementations of native features to write and test, kept small behind shared interfaces.

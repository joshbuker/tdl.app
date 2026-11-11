# Electron desktop app

## Context

The app ships on Windows, macOS and Linux as well as the web, Android and iOS (see [Platforms](../features/app/platforms.md)). The desktop app has to schedule reminders as local notifications (see [Reminders](../features/scheduling/reminders.md)) and run the MCP server locally (see [MCP server](../features/app/mcp-server.md)). The mobile apps are the web app wrapped with Capacitor. #2 and #3 wrapped the same codebase with Electron through Quasar, but never customized the desktop app.

## Decision

The desktop app is the web app wrapped with **Electron**, through Capawesome's **Capacitor Electron** bridge (MIT, released July 2026), so desktop uses the same Capacitor plugins (e.g. local notifications) as Android and iOS. The MCP server runs in Electron's Node process.

## Alternatives considered

- **Tauri 2**: smaller installers and lower memory use, because it uses the operating system's own browser engine. But it adds a Rust layer to a [TypeScript-only codebase](typescript-everywhere.md), the MCP server would have to be packaged as a separate Node binary (a sidecar), pages can render differently on each operating system, and Tauri 3 was already in alpha.
- **`@capacitor-community/electron`**: the older bridge, unmaintained since 2023.
- **Electron without Capacitor**: desktop would need its own code for notifications and other native features.

## Consequences

- Larger installers and memory use than a native or Tauri app.
- Capacitor Electron is new, so check its maintenance when upgrading. If it's abandoned, the fallback is plain Electron with our own small plugin implementations.
- One plugin API for native features on Android, iOS and desktop.

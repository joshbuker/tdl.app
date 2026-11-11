# TypeScript everywhere

## Context

Domain logic (graph rules, filtering and sorting, sync, access checks) must have one shared implementation that runs on the device and on the server (see [Offline first](offline-first.md)). #3 wrote graph logic twice, once in Postgres queries and once in the browser, and the two drifted apart. The same logic also has to run in the standalone MCP program and the API client library (see [API access](../features/app/api-access.md) and [MCP server](../features/app/mcp-server.md)), and the app ships on web, Android, iOS and desktop.

## Decision

All code is written in **TypeScript**: the apps on every platform, the server, the MCP program and the API client library. Shared domain logic lives in plain, framework-independent TypeScript packages that each of them imports.

Where a well-reviewed library exists only in another language (e.g. cryptography written in C or Rust), it is used from TypeScript as WebAssembly rather than reimplemented.

## Alternatives considered

- **Rust core with a TypeScript UI**: strong type safety and cryptography libraries, but two languages and a bindings layer to maintain before any feature works.
- **Kotlin Multiplatform**: native on Android, but its web and iOS targets are less mature and it has fewer well-reviewed cryptography libraries.
- **Dart and Flutter**: one codebase for all four platforms, but the web app draws to a canvas (weaker accessibility and text selection), and a Dart server is less common.
- **Ruby on Rails server with a TypeScript client** (#1 to #3): the server couldn't share domain logic with the apps.

## Consequences

- One copy of each domain rule, unit tested once and used everywhere.
- The server runs on a JavaScript runtime (e.g. Node), not Rails.
- Native code is needed only for platform features the app shell doesn't provide (e.g. scheduled local notifications), through plugins.

# Node and Fastify

## Context

The server is written in TypeScript (see [TypeScript everywhere](typescript-everywhere.md)). It serves:

- the sync protocol, with live updates over websockets (see [Custom sync](custom-sync.md));
- login through Better Auth (see [Better Auth](better-auth.md));
- a public, versioned API documented in OpenAPI (see [API access](../features/app/api-access.md)).

It runs as one container next to Postgres (see [Postgres on the server](postgres-on-the-server.md)). #1 to #3 used Rails.

## Decision

The server runs on **Node.js** (26 LTS at the time of writing, with Temporal built in) using the **Fastify** HTTP framework, with its websocket support for live updates. The OpenAPI document is generated from the routes' schemas, which are shared with the clients (see [Zod schemas](zod-schemas.md)).

## Alternatives considered

- **Hono**: smaller and faster-growing, with typed routes and a typed client the apps could import, but younger than Fastify.
- **Bun with Elysia**: faster in benchmarks, but the gap mostly disappears once a database is involved, and Bun is less proven for long-running self-hosted servers.
- **Deno**: compatible with most Node packages, but a smaller ecosystem for servers.
- **NestJS or AdonisJS**: full frameworks, heavier than one container needs.

## Consequences

- A mature, well-documented framework with a large plugin ecosystem.
- Routes need schemas to generate OpenAPI and validate input, so the schema library must have a Fastify adapter (see [Zod schemas](zod-schemas.md)).
- Node LTS upgrades are part of regular dependency updates.
- Node runs the TypeScript source directly, by stripping types, but refuses to do that for files under `node_modules`. The container image installs the workspace packages there (with `pnpm deploy`), so it compiles them to JavaScript first. Each package's `exports` has a `tdl-compiled` condition pointing at that build, which the image turns on; everywhere else the source is used (see `apps/server/Dockerfile`).

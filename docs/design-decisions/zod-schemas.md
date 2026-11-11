# Zod schemas

## Context

The server checks every request against a schema, and generates its OpenAPI document from the same schemas (see [Node and Fastify](node-and-fastify.md)). The sync operation format needs a schema too, shared by the server and every client. Better Auth already depends on Zod, and Drizzle 1.0 can generate Zod schemas from its tables.

## Decision

Schemas are written with **Zod 4** (MIT), at version 4.6.6 or later, which fixes a memory exhaustion advisory.

- Fastify uses them through **@fastify/type-provider-zod**, the adapter maintained by the Fastify organization, and @fastify/swagger turns them into OpenAPI 3.1.
- Shared schemas, including the sync operation format, live in `@tdl/sync`, so the server and the clients check the same shapes.
- `@tdl/domain` stays free of Zod. Its validators are plain functions, which the schemas call, so the rules stay in one place.

## Alternatives considered

- **TypeBox**: its schemas are JSON Schema, so the OpenAPI output is the most faithful. But it's clunkier for parsing, and it would be a second schema library next to Better Auth's Zod.
- **Valibot and ArkType**: lighter, but neither has a maintained Fastify adapter with OpenAPI generation.
- **turkerdev's fastify-type-provider-zod**: more users, but has open bugs in OpenAPI generation for parameters. It's the fallback if the Fastify organization's adapter stalls.

## Consequences

- Both Zod adapters have known gaps in OpenAPI output, so a snapshot test of the generated document guards against regressions.
- The domain package keeps only `uuid` as a runtime dependency.

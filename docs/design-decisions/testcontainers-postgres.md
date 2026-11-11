# Testcontainers for Postgres in tests

## Context

The server's tests need real Postgres semantics: concurrent transactions racing for sequence numbers, JSONB, and recursive queries. They run locally (NixOS, with Docker available) and in GitHub Actions.

## Decision

Server tests start a `postgres:18` container with **Testcontainers** (MIT), the same locally and in CI. Each test file gets its own database, so files can run in parallel.

## Alternatives considered

- **Postgres from the Nix shell locally, and a GitHub Actions service container in CI**: faster, with no Docker needed locally, but two setups to keep on the same major version.
- **PGlite** (Postgres compiled to WebAssembly): fastest, but it serves one connection at a time, so it can't test concurrent pushes.
- **pg-mem and embedded-postgres**: an emulator that isn't faithful to Postgres, and a package with only beta releases that downloads prebuilt binaries.

## Consequences

- Running the server's tests needs Docker (or a compatible runtime) on every development machine.
- Each test run pays the container's startup time, a few seconds.

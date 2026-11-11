# Releases and CI

## Context

Earlier attempts released from version tags and ran CI on every change. Dependencies can become vulnerable without any change to the code, so a project that is quiet for a while can drift into an unsafe state unnoticed.

## Decision

- Releases are built from version tags.
- CI runs on every change, and also weekly on the main branch, so newly reported vulnerabilities in dependencies are caught even without new commits.

## Alternatives considered

- **Release from the main branch on every merge**: faster, but app-store releases and self-hosters need clear versions.
- **CI only on changes**: misses vulnerabilities reported while the code is idle.

## Consequences

- Each release states which major version of the sync protocol it supports, since apps and servers must agree on it (see [Self-hosting](self-hosting.md)).

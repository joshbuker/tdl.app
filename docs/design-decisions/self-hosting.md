# Self-hosting

## Context

#3's API was described as serving "arbitrary TDL App front-ends". Its client let users enter a server URL on login, and its CORS settings were opened up for that reason.

## Decision

Self-hosting is supported: anyone can run their own TDL App server, and the apps can connect to any server. The official server is the default.

## Alternatives considered

- **Official server only**: simpler to operate, but users can't keep their own data, and the app depends on one host.

## Consequences

- The backend must be easy to deploy (e.g. a container image with documented configuration).
- Server-level settings such as invite-only mode (see `docs/features/account/sign-up.md`) are needed.
- Clients must handle servers running different versions. Federation between servers requires the same major protocol version.
- Users on different servers can share lists (see `docs/features/app/federation.md`), so servers must talk to each other: user addresses that include the server, and a server-to-server protocol. That protocol reuses device sync, with servers signing requests (see the federation spec).
- Cross-origin access must be opened deliberately, with that considered in the threat model.

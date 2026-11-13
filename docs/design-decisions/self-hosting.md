# Self-hosting

## Context

#3's API was described as serving "arbitrary TDL App front-ends". Its client let users enter a server URL on login, and its CORS settings were opened up for that reason.

## Decision

Self-hosting is supported: anyone can run their own TDL App server, and the apps can connect to any server. The official server is the default.

A self-hosted server is complete on its own. Two things depend on outside services: push notifications to the Android and iOS apps, through an opt-in relay run by tdl.app, and email (invites, verification and reset by email), through whatever mail service the admin configures. Without them, those features are unavailable and the admin is told so (see [Admin](../features/account/admin.md)).

## Alternatives considered

- **Official server only**: simpler to operate, but users can't keep their own data, and the app depends on one host.

## Consequences

- The server image includes the built web app and serves it from its own origin, so the browser uses the session cookie and a self-hoster needs no separate web host.
- The backend must be easy to deploy (a container image plus Postgres, with a Compose file and documented configuration; see [Postgres on the server](postgres-on-the-server.md)).
- Server-level settings such as invite-only mode (see `docs/features/account/sign-up.md`) are needed.
- Clients must handle servers running different versions. Federation between servers requires the same major protocol version.
- Users on different servers can share lists (see `docs/features/app/federation.md`), so servers must talk to each other: user addresses that include the server, and a server-to-server protocol. That protocol reuses device sync, with servers signing requests (see the federation spec).
- Cross-origin access must be opened deliberately, with that considered in the threat model.

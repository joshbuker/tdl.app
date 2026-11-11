# Better Auth

## Context

The server needs:

- login with a username or email and a password, with sessions stored on the server that can be revoked (see [Server-side sessions](server-side-sessions.md));
- passkeys and TOTP (see [Multi-factor authentication](../features/account/multi-factor-authentication.md));
- password reset by email (see [Login](../features/account/login.md));
- rate limiting;
- personal access tokens, and an OAuth provider so third-party apps can ask for access (see [API access](../features/app/api-access.md)).

Self-hosting must stay simple, and every dependency must be free and AGPL-compatible (see [Licence and pricing](licence-and-pricing.md)).

## Decision

Authentication uses **Better Auth** (MIT), running inside the server process: its email and password, two-factor, passkey, API key and OAuth provider plugins, and its rate limiting. Sessions are stored in Postgres.

The version is pinned to one that includes every published security fix, and the security-critical paths get acceptance tests of our own (login, session revocation, passkeys, reset, tokens and the OAuth flows).

## Alternatives considered

- **Assembling it from parts** (@oslojs, SimpleWebAuthn, node-oidc-provider, as Lucia now recommends): full control, but far more security-critical code to write and maintain.
- **A separate identity server** (Keycloak, Zitadel, or the open-core Ory and Authentik): battle-tested, but another container for every self-hoster.
- **Auth.js**: weaker support for acting as an OAuth provider.

## Consequences

- One library covers every login feature, in-process, with a Vue client for the apps.
- Vercel acquired Better Auth in July 2026; it stays MIT. Its OAuth provider is new, and a passkey vulnerability was fixed in 2026, so watch its security advisories. If it stops being suitable, the fallback is assembling from parts as above.

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
- Only the Better Auth endpoints the apps use are exposed over HTTP (sign-up, the two sign-ins and sign-out); the rest answer 404, so none of them can bypass our validation of [Account details](../features/account/user-validation.md) or the tombstone that revoking a session writes. Errors are translated into the [Error contract](error-contract.md). Sign-up refuses any key but its own, including Better Auth client keys such as `callbackURL` and `rememberMe`; the apps' API client sends only the allowed keys.
- Account details are validated by `@tdl/domain` first, counting characters. Better Auth counts UTF-16 code units, so its length limits are widened (the maximum password length is doubled) to never reject what the domain accepts.
- Vercel acquired Better Auth in July 2026; it stays MIT. Its OAuth provider is new, and a passkey vulnerability was fixed in 2026, so watch its security advisories. If it stops being suitable, the fallback is assembling from parts as above.

# API access

Status: Proposed
Release: v1
Related: [MCP server](mcp-server.md), [Sharing](sharing.md), [Self-hosting](../../design-decisions/self-hosting.md)

## Summary

Users and other programs can read and change their data through a documented public API, authorized with tokens the user creates.

## Design intent

#3's API was meant to serve "arbitrary TDL App front-ends", and the Backlog wanted a public API so other apps can build on tasks. The apps already need an API to sync with the server, so a stable, documented one lets users automate their own workflows and lets the [MCP server](mcp-server.md) build on it. #3 documented its API with OpenAPI, generated from its tests (rswag).

## Rules

- The API offers everything a user can do in the app, except account security actions (changing the password, managing passkeys and second factors, deleting the account).
- Data stays end-to-end encrypted through the API: responses carry encrypted data, and each token or OAuth grant carries its own key for decrypting it. An official client library handles the encryption, so the server never sees plaintext (see [End-to-end encryption](end-to-end-encryption.md)).
- Requests act as the user who authorized them, with exactly that user's access. Every permission rule applies, including what each user can see of the graph (see [Sharing](sharing.md)).
- Users create personal access tokens in their settings, each with a name, read-only or read-write access, and an optional expiry. Tokens can be revoked at any time, and the user can see when each was last used.
- A token, including its key, is shown in full only once, when it is created. Revoking a token takes effect at once: the server refuses it, so its key can't fetch anything more.
- Other apps can also ask the user for access with OAuth, getting the same kind of scoped, revocable access without a token being copied by hand.
- The API is versioned. Breaking changes only come with a new major version, and the previous one keeps working for a stated period.
- The API is documented in OpenAPI, generated from the tests so it can't drift from what the server does. The client library's documentation shows how to read and write decrypted data.
- Requests are rate limited per token, and clients are told their remaining allowance.
- Errors use the same contract as the apps (see "Design decisions to write" in [Open items](../../open-items.md)).

## Scenarios

### Create a token

- When "alice" creates a read-write token named "Home automation"
- Then she sees the token once
- And it is listed in her settings by name, without the token itself

### Token acts as its user

- Given "alice" has a token, and "bob" shared "Paint fence" with her as a viewer
- When a program uses her token to complete "Paint fence"
- Then it is refused, as it would be for her in the app

### Read-only token

- Given "alice" has a read-only token
- When a program uses it to create a task
- Then it is refused

### Revoke a token

- Given "alice" revoked her "Home automation" token
- When a program uses it
- Then it is refused as unauthorized

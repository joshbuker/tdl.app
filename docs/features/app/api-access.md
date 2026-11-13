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
- Data stays end-to-end encrypted through the API: responses carry encrypted data, and each token or OAuth grant carries its own key for decrypting it. An official client library handles the encryption, so the server never sees plaintext (see [End-to-end encryption](end-to-end-encryption.md)). (v2)
- Requests act as the user who authorized them, with exactly that user's access. Every permission rule applies, including what each user can see of the graph (see [Sharing](sharing.md)).
- Users create personal access tokens in their settings, each with a name, read-only or read-write access, and an optional expiry. Tokens can be revoked at any time, and the user can see when each was last used.
- A token, including its key, is shown in full only once, when it is created. Revoking a token takes effect at once: the server refuses it, so its key can't fetch anything more.
- Other apps can also ask the user for access with OAuth, getting the same kind of scoped, revocable access without a token being copied by hand.
- The API is versioned with the sync protocol, like the apps (see [Version compatibility](version-compatibility.md)). Breaking changes only come with a new major version, and programs must update to it: the server refuses an older major version with an error saying so.
- The API is documented in OpenAPI, generated from the tests so it can't drift from what the server does. The client library's documentation shows how to read and write data, decrypted from v2.
- Requests are rate limited per token, and clients are told their remaining allowance.
- Errors use the same contract as the apps (see [Error contract](../../design-decisions/error-contract.md)).

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

### Authorize another app

- When another app asks "alice" for read-only access with OAuth, and she approves
- Then the app can read her tasks, without her copying a token by hand

### Revoke another app

- Given "alice" gave another app access with OAuth
- When she revokes its access
- Then the app's requests are refused

### Older major version is refused

- Given a program uses version 1 of the API, and the server has been updated to version 2
- When it makes a request
- Then it is refused with an error saying the program must update to version 2

### Remaining allowance

- When a program makes a request with alice's token
- Then the response tells it how many requests it has left

### Over the rate limit

- Given a program has used up the allowance of alice's token
- When it makes another request
- Then it is refused as rate limited

### No account security actions

- Given "alice" has a read-write token
- When a program uses it to change her password
- Then it is refused

### Expired token

- Given "alice" created a token that expired yesterday
- When a program uses it
- Then it is refused as unauthorized

### See when a token was last used

- Given a program used alice's "Home automation" token yesterday
- Then her settings show it was last used yesterday

### Responses stay encrypted (v2)

- When a program reads "Paint fence" with alice's token through the client library
- Then the server's response contains no readable title
- And the client library shows the title "Paint fence"

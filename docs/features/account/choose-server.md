# Choose a server

Status: Proposed
Related: [Login](login.md), [Federation](../app/federation.md)

## Summary

On the login screen, the user can enter which server to connect to, so the app works with a self-hosted backend.

## Design intent

Self-hosting is a goal (see [Self-hosting](../../design-decisions/self-hosting.md)). Added in #3: the API's stated audience was "arbitrary TDL App front-ends", and the client let users pick their server.

References for the implementation:

- **Immich**: its mobile app asks for the server URL on the login screen before credentials.
- **Bitwarden**: its apps offer a choice of the official servers or a self-hosted server URL on the login screen.

Check both apps' current behavior before implementing.

## Rules

- The server address defaults to the official one.
- The chosen server is remembered.

## Scenarios

### Log in to a self-hosted server

- When the user enters a server address and valid credentials for it
- Then they are logged in to that server

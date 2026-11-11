# Choose a server

Status: Proposed
Release: v1
Related: [Login](login.md), [Federation](../app/federation.md)

## Summary

Before logging in or signing up, the user chooses the official server or a self-hosted one, so the app works with any TDL App server.

## Design intent

Self-hosting is a goal (see [Self-hosting](../../design-decisions/self-hosting.md)). Added in #3: the API's stated audience was "arbitrary TDL App front-ends", and the client let users pick their server.

References for the implementation:

- **Immich**: its mobile app asks for the server URL on the login screen before credentials.
- **Bitwarden**: its apps offer a choice of the official servers or a self-hosted server URL on the login screen.

Check both apps' current behavior before implementing.

## Rules

- The first screen asks whether to use the official server (tdl.app) or a self-hosted one.
- Choosing Official goes straight to logging in or signing up on tdl.app.
- Choosing Self-hosted asks for the server's address first. The app checks that it is a TDL App server running a compatible version, and says why if it isn't. Then it goes to logging in or signing up on that server.
- The chosen server is remembered, so next time the app opens straight to logging in on it. The user can go back and choose a different server.

## Scenarios

### Official server

- When the user opens the app for the first time and chooses Official
- Then they are asked to log in or sign up on tdl.app

### Self-hosted server

- When the user chooses Self-hosted and enters "tdl.example.com"
- Then they are asked to log in or sign up on tdl.example.com
- And after logging in with valid credentials, they are logged in to that server

### Not a TDL App server

- When the user chooses Self-hosted and enters an address that isn't a TDL App server
- Then they are told it isn't a TDL App server, and stay on the address step

### Incompatible server version

- When the user enters the address of a TDL App server running an incompatible version
- Then they are told the server's version isn't supported by this app

### Chosen server is remembered

- Given the user logged in to "tdl.example.com", then logged out
- When they open the app again
- Then it opens on logging in to "tdl.example.com", with an option to choose a different server

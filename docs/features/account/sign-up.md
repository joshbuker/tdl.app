# Sign up

Status: Proposed
Related: [Login](login.md), [Request access](request-access.md), [Account details](user-validation.md)

## Summary

Anyone can create an account, unless the server is in invite-only mode, in which case visitors [request access](request-access.md) instead.

## Design intent

#1 to #3 had no sign-up: accounts were created by hand, with request access as the way in during invite-only phases. Public sign-up removes that manual step. Invite-only mode is kept as a server setting for early release phases and for self-hosters who only want their own accounts.

## Rules

- Sign-up asks for the account details in [Account details](user-validation.md) and acceptance of the terms.
- In invite-only mode, sign-up is not available and visitors are directed to request access.

## Scenarios

### Sign up

- Given the server allows public sign-up
- When a visitor signs up with valid details
- Then they have an account and are logged in

### Invite-only mode

- Given the server is in invite-only mode
- When a visitor tries to sign up
- Then they are offered the request access form instead

## Open questions

- Is email verification required before the account can be used?

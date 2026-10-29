# Multi-factor authentication

Status: Proposed
Release: v1
Related: [Login](login.md)

## Summary

The user can protect their account with a second factor, required at login.

## Design intent

Planned since #2: the #2 and #3 APIs had stub endpoints for hardware tokens (WebAuthn) and authenticator apps, returning "not implemented". Included from launch in attempt #4.

## Rules

- Multi-factor authentication is optional per user.
- When set up, logging in requires the second factor after the password.
- Supported factors are an authenticator app (TOTP) and passkeys or hardware keys (WebAuthn). A user can set up several, and any one of them works.
- Setting up the first factor gives the user a set of single-use recovery codes. Each code can be used once in place of a factor. The user can generate a new set, which invalidates the old one.
- Removing the last factor turns MFA off, and requires the password.

## Scenarios

### Log in with a second factor

- Given "alice" has multi-factor authentication set up
- When she logs in with the correct password
- Then she is asked for her second factor before seeing her tasks

### Log in with a recovery code

- Given "alice" has MFA set up and has lost her device
- When she logs in with her password and an unused recovery code
- Then she is logged in, and that code can't be used again

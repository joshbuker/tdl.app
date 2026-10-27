# Multi-factor authentication

Status: Proposed
Related: [Login](login.md)

## Summary

The user can protect their account with a second factor, required at login.

## Design intent

Planned since #2: the #2 and #3 APIs had stub endpoints for hardware tokens (WebAuthn) and authenticator apps, returning "not implemented". Included from launch in attempt #4.

## Rules

- Multi-factor authentication is optional per user.
- When set up, logging in requires the second factor after the password.

## Scenarios

### Log in with a second factor

- Given "alice" has multi-factor authentication set up
- When she logs in with the correct password
- Then she is asked for her second factor before seeing her tasks

## Open questions

- Which factors: authenticator app (TOTP), passkeys/hardware keys (WebAuthn), or both?
- Recovery codes for a lost device?

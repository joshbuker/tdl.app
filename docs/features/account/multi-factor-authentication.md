# Multi-factor authentication

Status: Proposed
Release: v1
Related: [Login](login.md)

## Summary

The user can protect their account with a second factor, required at login, and can log in with a passkey instead of a password.

## Design intent

Planned since #2: the #2 and #3 APIs had stub endpoints for hardware tokens (WebAuthn) and authenticator apps, returning "not implemented". Included from launch in attempt #4.

## Rules

- Multi-factor authentication is optional per user.
- When set up, logging in with a password requires a second factor after it.
- Supported second factors are an authenticator app (TOTP, with a secret the user adds to their app) and passkeys or hardware keys (WebAuthn). SMS is not supported. A user can set up several, and any one of them works.
- A passkey can also be used to log in without a password. A passkey login counts as multi-factor on its own, so no second factor is asked for.
- A user can have several passkeys, e.g. one per device.
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

### Log in with a passkey

- Given "alice" has added a passkey on her phone
- When she chooses to log in with a passkey and confirms on her phone
- Then she is logged in without entering a password or a second factor

### Passkey as a second factor

- Given "alice" has MFA set up with a passkey
- When she logs in with her password
- Then she can confirm with her passkey as the second factor

### No SMS codes

- When "alice" sets up multi-factor authentication
- Then the factors offered are an authenticator app and passkeys, not SMS

### MFA is optional

- Given "alice" has not set up multi-factor authentication
- When she logs in with the correct password
- Then she is logged in without being asked for a second factor

### Any factor works

- Given "alice" has an authenticator app and a hardware key set up
- When she logs in with her password
- Then she can confirm with either one

### Several passkeys

- Given "alice" has a passkey on her phone and another on her laptop
- Then she can log in with either one

### Recovery codes come with the first factor

- When "alice" sets up her first factor
- Then she is given a set of single-use recovery codes

### New recovery codes replace the old ones

- Given "alice" has a set of recovery codes
- When she generates a new set
- Then none of her old codes work, and the new ones do

### Remove the last factor

- Given "alice" has only an authenticator app set up
- When she removes it and confirms with her password
- Then multi-factor authentication is off, and she logs in with her password alone

### Removing the last factor needs the password

- Given "alice" has only an authenticator app set up
- When she tries to remove it without entering her password
- Then it isn't removed

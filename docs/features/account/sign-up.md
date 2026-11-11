# Sign up

Status: Proposed
Release: v1
Related: [Login](login.md), [Request access](request-access.md), [Account details](user-validation.md)

## Summary

Anyone can create an account, unless the server is in invite-only mode, in which case visitors need a sign-up invite link or an email invite from an admin. In v2 they can also [request access](request-access.md).

## Design intent

#1 to #3 had no sign-up: accounts were created by hand, with request access as the way in during invite-only phases. Public sign-up removes that manual step. Invite-only mode is kept as a server setting for early release phases and for self-hosters who only want their own accounts.

## Rules

- Sign-up asks for the account details in [Account details](user-validation.md) and acceptance of the terms.
- In invite-only mode, sign-up is not available, and visitors are told so. In v2 they are directed to request access instead.
- A server admin can create sign-up invite links, either single use or usable until revoked. Opening one allows signing up even in invite-only mode.
- A server admin can also invite someone by email. They get an email with a link to sign up, which works even in invite-only mode. The sign-up form has that email address filled in and read-only. Otherwise sign-up is the same, and the email counts as verified. The link is single use by nature, and the admin can revoke it until it is used.
- A new account must verify its email address before it can be used. A server admin can turn this off, e.g. on a self-hosted server without email set up.

## Scenarios

### Sign up

- Given the server allows public sign-up
- When a visitor signs up with valid details
- Then they have an account and are logged in

### Invite-only mode

- Given the server is in invite-only mode
- When a visitor tries to sign up
- Then they are told sign-up is closed

### Email must be verified

- Given "carol" has just signed up
- When she tries to use the app before opening the verification email
- Then she is asked to verify her email first

### Sign up with an invite link

- Given the server is in invite-only mode
- And an admin created a single-use sign-up invite link
- When "carol" opens the link and signs up with valid details
- Then she has an account
- And the link no longer works

### Revoked invite link

- Given an admin revoked a sign-up invite link
- When a visitor opens it
- Then they are told the link is no longer valid

### Invite by email

- Given the server is in invite-only mode
- And an admin invited alice@example.com
- When she opens the link in the invite email and signs up
- Then she has an account with alice@example.com, without verifying it again

### Email invite fixes the address

- Given an admin invited alice@example.com
- When someone opens the invite link
- Then the email field shows alice@example.com and can't be changed

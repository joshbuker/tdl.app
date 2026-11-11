# Admin

Status: Proposed
Release: v1
Related: [Sign up](sign-up.md), [Billing](billing.md), [End-to-end encryption](../app/end-to-end-encryption.md), [Self-hosting](../../design-decisions/self-hosting.md)

## Summary

Admins manage a server's accounts and settings, without ever being able to read anyone's data.

## Design intent

Every server, tdl.app or self-hosted, needs someone to invite people, give free access, and set limits. Because all user data is end-to-end encrypted, admins manage accounts, not content (see [End-to-end encryption](../app/end-to-end-encryption.md)).

## Rules

- The first account created on a server is its admin. Admins can make other accounts admins, and remove admin from them, but the last admin can't be removed.
- Admins see each account's username, email, whether it's an admin, storage used, billing state and when it last synced. They never see any user's data.
- Admins can:
  - create sign-up invite links and email invites (see [Sign up](sign-up.md));
  - give or take away free access (see [Billing](billing.md));
  - disable an account, which logs it out everywhere and blocks logging in until re-enabled;
  - delete an account, after confirming, with the same handling of shared lists as when a user deletes their own (see [Delete account](delete-account.md));
  - reset a user's second factors, so they can log in with their password and set them up again. This doesn't unlock their data;
  - manage server settings: sign-up mode, email verification, billing, trials, the minimum price, attachment limits, and using the push relay (see [Notifications](../app/notifications.md)).
- Every admin action is recorded in an admin log, showing who did what and when. Admins can read the log but not change it.
- The server tells admins which features are unavailable because of its setup (e.g. no email configured, so no email invites or reset by email).

## Scenarios

### First account is admin

- Given a new self-hosted server with no accounts
- When "alice" signs up
- Then she is the server's admin

### Admins can't read data

- Given "alice" is an admin
- When she views "bob"'s account
- Then she sees his username, email, storage used, billing state and last sync, and none of his tasks

### Disable an account

- Given "bob" is logged in on two devices
- When an admin disables his account
- Then he is logged out on both, and can't log in until it's enabled again

### Reset second factors

- Given "bob" lost his authenticator app
- When an admin resets his second factors
- Then he can log in with his password and set up a new factor
- And his data is still only readable once he unlocks it himself

### Admin actions are logged

- When an admin gives "carol" free access
- Then the admin log shows which admin did it, and when

### Last admin stays

- Given "alice" is the only admin
- When she tries to remove her own admin role
- Then it isn't allowed

### Make another admin

- Given "alice" is an admin
- When she makes "bob" an admin
- Then "bob" can manage the server's accounts and settings

### Remove an admin

- Given "alice" and "bob" are admins
- When "alice" removes bob's admin role
- Then "bob" can no longer manage the server's accounts and settings

### Admin deletes an account

- Given "bob" owns an unshared list "Personal"
- When an admin deletes bob's account and confirms
- Then his account and "Personal" no longer exist

### Admin log can't be changed

- Given the admin log shows that "alice" gave "carol" free access
- When "alice" tries to edit or delete that entry
- Then it isn't allowed

### Change the sign-up mode

- When an admin switches the server to invite-only
- Then visitors who try to sign up are told sign-up is closed

### Unavailable features are shown

- Given a self-hosted server has no email configured
- When the admin views the server settings
- Then they are told email invites and reset by email are unavailable

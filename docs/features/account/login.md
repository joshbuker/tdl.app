# Login

Status: Proposed
Release: v1
Related: [Sign up](sign-up.md), [Multi-factor authentication](multi-factor-authentication.md), [Change password](change-password.md), [Choose a server](choose-server.md)

## Summary

The user logs in with a username and password, and can log out.

## Design intent

#2 and #3 used sessions stored on the server, so logging out (or revoking a lost device) actually ends the session rather than waiting for a token to expire. Repeated failed logins lock the account temporarily.

## Rules

- Login uses a username or email address with a password, or a passkey without a password (see [Multi-factor authentication](multi-factor-authentication.md)). Usernames and email addresses are both unique, so either one identifies the account.
- If the user has multi-factor authentication set up, a second step is required (see [Multi-factor authentication](multi-factor-authentication.md)).
- A user who forgot their password recovers access as described in [End-to-end encryption](../app/end-to-end-encryption.md).
- Wrong credentials are rejected without saying which one was wrong.
- Repeated failed attempts slow down further attempts, per account and per network address, with increasing delays. The account is never locked outright, so nobody can lock someone else out by guessing.
- Logging out ends the session on the server. A logged-out session can't be reused.
- Logging out clears local data even if the server can't be reached. If there are changes that haven't synced yet, the user is warned first, and can cancel to let them sync.
- Pages other than login require being logged in.
- When a session expires while the app is open, a login dialog appears over the current page instead of going to the login page. Changes made meanwhile keep being saved on the device, and sync once the user logs back in.

## Scenarios

### Log in

- Given a user "alice" with a known password
- When she logs in with those credentials
- Then she sees her tasks

### Log in with email

- Given "alice" has the email alice@example.com
- When she logs in with alice@example.com and her password
- Then she sees her tasks

### Wrong password

- When a user logs in with the wrong password
- Then login fails with a generic message

### Not logged in

- Given the user is not logged in
- When they open any page
- Then they are taken to the login page

### Session expires in place

- Given "alice" is editing "Paint fence" and her session expires
- When she logs in again through the dialog that appears
- Then she is still on "Paint fence", and her changes are kept and synced

### Log out

- Given a logged-in user
- When they log out
- Then they are on the login page and the old session no longer works

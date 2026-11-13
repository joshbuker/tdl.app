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
- A user who forgot their password can reset it with a link sent to their email address. The link is single use and expires after an hour. Resetting the password logs out every session. From v2, recovery works as described in [End-to-end encryption](../app/end-to-end-encryption.md) instead.
- Wrong credentials are rejected without saying which one was wrong.
- Repeated failed attempts slow down further attempts, per account and per network address, with increasing delays. The account is never locked outright, so nobody can lock someone else out by guessing.
- Each device has its own session, which lasts until it logs out or is revoked, and expires after 90 days without syncing. Settings list every logged-in device with when it last synced, and the user can revoke any of them (see [Server-side sessions](../../design-decisions/server-side-sessions.md)).
- A revoked device deletes its local data, including changes that haven't synced, as soon as it next reaches the server, in case it was lost or stolen. A session that expires, or that ends for any other reason, keeps the device's data and unsynced changes, and asks the user to log in again.
- Logging out ends the session on the server. A logged-out session can't be reused.
- Logging out clears local data even if the server can't be reached. If there are changes that haven't synced yet, the user is warned first and chooses: log in again so they sync (or, if still logged in, stay so they sync), or discard them and log out.
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

### Reset a forgotten password

- Given "alice" forgot her password
- When she asks for a reset link and sets a new password from the email
- Then she can log in with the new password, and her tasks are there
- And her other sessions are logged out

### Not logged in

- Given the user is not logged in
- When they open any page
- Then they are taken to the login page

### Session expires in place

- Given "alice" is editing "Paint fence" and her session expires
- When she logs in again through the dialog that appears
- Then she is still on "Paint fence", and her changes are kept and synced

### Revoke a lost device

- Given "alice" is logged in on her phone and laptop
- When she revokes her phone from her laptop's settings
- Then her phone is logged out and stops syncing
- And the next time the phone reaches the server, it deletes its local data, including changes that hadn't synced

### Log out

- Given a logged-in user
- When they log out
- Then they are on the login page and the old session no longer works

### Log out with unsynced changes

- Given "alice"'s session has expired, and she edited "Paint fence" since it last synced
- When she logs out
- Then she is warned that the change to "Paint fence" hasn't synced, and offered to log in again or discard it

### Discard unsynced changes

- Given "alice" is warned about unsynced changes while logging out
- When she chooses to discard them
- Then she is logged out, and her device's data is deleted

### Log in again to keep unsynced changes

- Given "alice" is warned about unsynced changes while logging out, after her session expired
- When she chooses to log in again, and does
- Then her changes sync, and she is still logged in

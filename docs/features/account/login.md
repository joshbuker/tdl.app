# Login

Status: Proposed
Release: v1
Related: [Sign up](sign-up.md), [Multi-factor authentication](multi-factor-authentication.md), [Change password](change-password.md), [Choose a server](choose-server.md)

## Summary

The user logs in with a username and password, and can log out.

## Design intent

#2 and #3 used sessions stored on the server, so logging out (or revoking a lost device) actually ends the session rather than waiting for a token to expire. Repeated failed logins lock the account temporarily.

## Rules

- Login uses username and password. Email is not accepted as a login.
- If the user has multi-factor authentication set up, a second step is required (see [Multi-factor authentication](multi-factor-authentication.md)).
- Wrong credentials are rejected without saying which one was wrong.
- After 10 failed attempts, the account is locked for a while.
- Logging out ends the session on the server. A logged-out session can't be reused.
- Logging out clears local data even if the server can't be reached.
- Pages other than login require being logged in.

## Scenarios

### Log in

- Given a user "alice" with a known password
- When she logs in with those credentials
- Then she sees her tasks

### Wrong password

- When a user logs in with the wrong password
- Then login fails with a generic message

### Not logged in

- Given the user is not logged in
- When they open any page
- Then they are taken to the login page

### Log out

- Given a logged-in user
- When they log out
- Then they are on the login page and the old session no longer works

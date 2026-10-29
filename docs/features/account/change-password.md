# Change password

Status: Proposed
Release: v1
Related: [Account details](user-validation.md)

## Summary

The user changes their password by entering their current password and a new one.

## Design intent

From #3. The checks are specific so the user knows exactly what went wrong.

## Rules

- Both the current and new password are required.
- The new password must differ from the current one.
- The current password must be correct.
- The new password must meet the password rules.
- The new password is entered twice and both entries must match.

## Scenarios

### Change password

- When the user enters their correct current password and a valid new password twice
- Then they can log in with the new password

### Wrong current password

- When the user enters an incorrect current password
- Then the password is not changed and the user is told the current password is wrong

## Open questions

- Should changing the password log out other sessions?

# End-to-end encryption

Status: Proposed
Release: v1
Related: [End-to-end encryption](../../design-decisions/end-to-end-encryption.md), [Sharing](sharing.md), [Sign up](../account/sign-up.md), [Login](../account/login.md), [Multi-factor authentication](../account/multi-factor-authentication.md)

## Summary

Everything the user puts in the app is encrypted on their devices, so nobody running a server can read it. A recovery key keeps the account recoverable.

## Design intent

Like Signal, Proton and 1Password, the server holds the user's data without being able to read it (see [End-to-end encryption](../../design-decisions/end-to-end-encryption.md)). It is always on, with no unencrypted mode. The cost is that a lost password can't simply be reset by the server, so recovery has to be set up ahead of time.

## Rules

- All task content and settings are encrypted on the device before syncing, and decrypted only on the devices of people with access. The server sees only what it needs to route and authorize sync (see the decision record for the full list).
- Sharing a list, task or tag also gives the people it's shared with the keys to read it. Removing someone's access gives what they could see new keys, so they can't read later changes.
- At sign-up, the user is shown a recovery key and asked to save it. They can view it again or replace it from a logged-in device, which invalidates the old one.
- A new device can be unlocked with the password plus a second factor if set up, with a passkey, by approval from a device that's already logged in, or with the recovery key.
- A user who has forgotten their password can regain access with the recovery key, or by approving from a logged-in device, and then set a new password.
- If the user has none of those, they can reset their account by email. The account and username are kept, but all their encrypted data is deleted. They are warned clearly before confirming.
- Changing the password doesn't change or lose any data.
- Admins can't read any user's data, and can't recover it.
- Exporting data decrypts it on the device into the export file. Importing encrypts it on the device (see [Import and export](import-export.md)).

## Scenarios

### Server can't read tasks

- Given "alice" has a task "Plan surprise party"
- When someone with full access to the server's database reads her records
- Then they see no title, notes, dates or links, only IDs, ownership, grants and sync timestamps

### Recovery key at sign-up

- When "carol" signs up
- Then she is shown a recovery key and asked to save it before continuing

### Unlock a new device from an existing one

- Given "alice" is logged in on her phone
- When she logs in on a new laptop and approves it from her phone
- Then her tasks appear on the laptop

### Recover with the recovery key

- Given "alice" forgot her password
- When she enters her username and recovery key
- Then she can set a new password, and all her tasks are there

### Reset without recovery loses data

- Given "alice" forgot her password and has no recovery key, passkey or logged-in device
- When she resets her account by email and confirms the warning
- Then she can log in again, and her previous tasks are gone

### Removed collaborator can't read new changes

- Given "bob" was an editor of "House" and "alice" removed him
- When "alice" adds a task to "House"
- Then "bob" can't read it, even with a copy of the server's data

## Open questions

- When a user resets their account without recovery, what happens to lists and tasks they owned and shared? Collaborators still have the keys. Options:
  - Delete them for everyone, as if the owner had deleted them.
  - Offer ownership to an editor first, then delete what nobody takes over.
  - Keep them, with ownership passing automatically to an editor.

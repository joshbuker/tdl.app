# Delete account

Status: Proposed
Release: v1
Related: [Sharing](../app/sharing.md), [End-to-end encryption](../app/end-to-end-encryption.md), [Import and export](../app/import-export.md)

## Summary

The user can delete their account and all their data, after deciding what happens to lists they share with others.

## Design intent

Users must be able to leave and take nothing behind. Lists they share are also other people's work, so those people get a chance to keep them.

## Rules

- Deleting an account is self-service, and must be confirmed with the password or a passkey.
- Before deleting, the user is offered an export (see [Import and export](../app/import-export.md)).
- For each list the user owns that is shared with others, they can transfer ownership to one of its editors. Anything not transferred is deleted for everyone, after a warning that names those lists and who will lose them.
- Lists and tasks they own that aren't shared are deleted, along with their settings, tokens and login factors.
- Comments they wrote on other people's tasks stay, attributed to a deleted user. Their assignments elsewhere become free text with their name (see [Assignment](../organization/assignment.md)).
- Their access to lists and tasks others shared with them is removed.
- Deletion can't be undone. The username can't be used again for 30 days.

## Scenarios

### Delete an account

- Given "carol" owns an unshared list "Personal"
- When she deletes her account and confirms with her password
- Then her account and "Personal" no longer exist

### Transfer before deleting

- Given "alice" owns "House", shared with "bob" as an editor
- When she deletes her account and transfers "House" to "bob" first
- Then "bob" owns "House" and its tasks, and "alice"'s account no longer exists

### Untransferred shared lists are deleted

- Given "alice" owns "Trip", shared with "bob"
- When she deletes her account without transferring "Trip", and confirms the warning
- Then "Trip" no longer exists for "bob"

### Deleting needs confirmation

- When "carol" tries to delete her account without entering her password or using a passkey
- Then her account isn't deleted

### Export is offered first

- When "carol" starts deleting her account
- Then she is offered an export of her data before continuing

### Warning names the lists and people

- Given "alice" owns "Trip", shared with "bob"
- When she deletes her account without transferring "Trip"
- Then before she confirms, she is warned that "Trip" will be deleted and "bob" will lose it

### Transfer only to an editor

- Given "alice" owns "Trip", shared with "bob" as a viewer
- When she deletes her account
- Then "bob" is not offered as the new owner of "Trip"

### Comments stay after deleting

- Given "carol" commented on alice's task "Paint fence"
- When "carol" deletes her account
- Then the comment stays, attributed to a deleted user

### Assignments become free text

- Given "Paint fence" is assigned to "carol"
- When "carol" deletes her account
- Then "Paint fence" is assigned to her name as free text

### Access to others' lists is removed

- Given "bob" shared "House" with "carol"
- When "carol" deletes her account
- Then "carol" is no longer among the people with access to "House"

### Username is held for 30 days

- Given "carol" deleted her account 10 days ago
- When a visitor signs up with the username "carol"
- Then they are told the username is taken

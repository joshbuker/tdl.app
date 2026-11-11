# Billing

Status: Proposed
Release: v1
Related: [Licence and pricing](../../design-decisions/licence-and-pricing.md), [Sign up](sign-up.md), [Self-hosting](../../design-decisions/self-hosting.md)

## Summary

Accounts on tdl.app pay what they want, above a minimum, after an optional free trial. Admins can give accounts free access, and invites can create accounts with free access. Accounts that aren't paying become read-only.

## Design intent

Billing belongs to each server, and apps can connect to any server, many of which charge nothing, so payment always happens on the server's website, never in the apps. Pricing on tdl.app starts from day one, so the hosted service covers its costs and paying is normal from the start (see [Licence and pricing](../../design-decisions/licence-and-pricing.md)). The first users, friends and family, are covered by free access rather than by a period with no pricing. Self-hosters run their own servers, so billing is a server setting that is off unless the admin turns it on.

## Rules

- Billing is a server setting. It is on for tdl.app, and off by default on self-hosted servers. With billing off, every account has full access.
- With billing on, an account is paying, has free access, is in its free trial, or is non-paying.
- A paying account chooses how much to pay, at or above the server's minimum, monthly or yearly. It can change the amount at any time, taking effect from the next payment.
- An account becomes non-paying when it cancels, when a payment is declined, when its trial ends without a payment, or when free access is taken away. The user is told why.
- If the minimum goes up, accounts paying less than the new minimum are no longer charged and become non-paying. They are told the new minimum, and can start paying again at or above it.
- A non-paying account's data is deleted after 12 months of being non-paying. The user is emailed 30 days and 7 days before, with a reminder to pay or export.
- A non-paying account is read-only until it starts paying again: the user can see everything and export their data, but can't make changes or import. Reminders still fire, and can be snoozed or dismissed.
- Read-only never blocks account and safety actions: logging in and out, changing the password or login factors, revoking tokens, leaving shared lists and tasks, removing collaborators from their own lists, exporting, paying, and deleting the account.
- Read-only applies to the non-paying user, not to what they own. Collaborators who are paying (or have free access or a trial) can still edit lists and tasks shared with them by a non-paying owner, as their role allows.
- Admin accounts always have free access.
- An admin can give any account free access, and take it away.
- Free trials are a server setting: on or off, and how long they last (e.g. 7 or 30 days). They can only be turned on while billing is on. With trials on, new accounts start with a trial and full access, unless they have free access.
- A trial never asks for payment details, so nobody is charged for a trial they forgot about. Users can add payment details during the trial, but are still asked to confirm when it ends before anything is charged. Until they confirm, the account is non-paying.
- When an account becomes read-only, the user sees one dialog explaining why, that the account is now read-only, and how to pay to keep editing. The same dialog confirms payment at the end of a trial.
- Sign-up invite links and email invites can be set to give free access, so the account starts with it (see [Sign up](sign-up.md)).
- Payments go through a payment provider. The server never stores card details.
- Payment happens on the server's website only. The phone and desktop apps never sell anything, since the server they connect to may not charge at all. They show the account's status, and where store rules allow, link to the server's website to pay.

## Scenarios

### Pay what you want

- Given the minimum is $3 a month
- When "carol" signs up and chooses to pay $5 a month
- Then she is charged $5 a month and has full access

### Below the minimum

- Given the minimum is $3 a month
- When "carol" chooses to pay $1 a month
- Then she is told the minimum is $3

### Invite with free access

- Given an admin sent "dad@example.com" an email invite with free access
- When he signs up from it
- Then his account has free access and is never asked to pay

### Trial ends without paying

- Given trials last 7 days, and "carol" signed up 7 days ago without paying
- Then her account is read-only
- And she can still export her data

### Payment details added during a trial still need confirming

- Given "carol" added her card during her trial
- When the trial ends
- Then she isn't charged yet, and is asked to confirm that she wants to pay and keep editing
- And until she confirms, her account is read-only

### Read-only until paying again

- Given "carol" cancelled her payments
- When she tries to complete a task or import data
- Then she is told her account is read-only until she pays
- And once she pays again, she can make changes

### Minimum goes up

- Given "carol" pays $3 a month
- When the minimum goes up to $4 a month
- Then she is no longer charged, her account is read-only, and she is told the new minimum

### Declined payment

- Given "carol"'s card is declined for her monthly payment
- Then her account is read-only, and she is told to update her payment method

### Non-paying data is deleted after a year

- Given "carol" has been non-paying for 11 months
- Then she is emailed that her data will be deleted in 30 days unless she pays, with a link to export
- And after 12 months, her data is deleted

### Trials need billing

- Given billing is off on a self-hosted server
- When the admin tries to turn on free trials
- Then it isn't allowed until billing is on

### Self-hosted server without billing

- Given a self-hosted server with billing off
- When "alice" signs up
- Then she has full access without paying

### Collaborators keep editing

- Given "alice" owns "House", shares it with "bob" as an editor, and becomes non-paying
- When "bob", who is paying, edits "Paint fence"
- Then his change is saved
- And "alice" can see it but can't make changes herself

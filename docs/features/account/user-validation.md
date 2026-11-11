# Account details

Status: Proposed
Release: v1
Related: [Login](login.md)

## Summary

Rules for usernames, emails, names and passwords on an account.

## Design intent

From #2 and #3, which share the same rules. Input is validated strictly rather than silently normalized, so the user sees exactly what was stored. Each problem gets its own clear message.

## Rules

- Username: required, at most 69 characters, no whitespace, unique ignoring case. Any other characters, including emoji and non-Latin scripts, are allowed.
- Email: required, valid format, lowercase, unique ignoring case. Uppercase is rejected, not lowercased.
- Password: 14 to 128 characters, and not found in known data breaches (checked against Have I Been Pwned without sending the password itself). There are no character-type rules, following current NIST guidance; #2 and #3 built a "3 of 4 character types" check but never enabled it.
- Given name and family name are required.
- The time the user accepted the terms is recorded.

## Scenarios

### Username is required

- When a visitor signs up without a username
- Then they are told a username is required

### Username too long

- When a visitor signs up with a username of 70 characters
- Then they are told a username can be at most 69 characters

### Username with a space

- When a visitor signs up with the username "alice smith"
- Then they are told a username can't contain spaces

### Username taken, ignoring case

- Given "alice" has an account
- When a visitor signs up with the username "Alice"
- Then they are told the username is taken

### Username in any script

- When a visitor signs up with the username "アリス"
- Then the username is accepted

### Email in the wrong format

- When a visitor signs up with the email "alice.example.com"
- Then they are told the email isn't valid

### Uppercase email is rejected

- When a visitor signs up with the email "Alice@example.com"
- Then they are told the email must be lowercase
- And it is not lowercased for them

### Email already used

- Given "alice" has an account with alice@example.com
- When a visitor signs up with alice@example.com
- Then they are told the email is already used

### Password too short

- When a visitor signs up with a password of 13 characters
- Then they are told a password needs at least 14 characters

### Password too long

- When a visitor signs up with a password of 129 characters
- Then they are told a password can be at most 128 characters

### Breached password

- Given "passwordpassword" appears in known data breaches
- When a visitor signs up with it as their password
- Then they are told the password has appeared in a data breach

### No character-type rules

- Given "paint the fence on saturday" doesn't appear in known data breaches
- When a visitor signs up with it as their password
- Then the password is accepted, though it has only lowercase letters and spaces

### Names are required

- When a visitor signs up without a family name
- Then they are told a family name is required

### Terms acceptance is recorded

- When "carol" signs up and accepts the terms
- Then her account records when she accepted them

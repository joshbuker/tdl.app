# Account details

Status: Proposed
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

- One per rule above, each with an invalid example and its message.

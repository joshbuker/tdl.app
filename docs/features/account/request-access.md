# Request access

Status: Proposed
Release: v1
Related: [Sign up](sign-up.md)

## Summary

When the server is in invite-only mode (see [Sign up](sign-up.md)), a visitor without an account asks for access by giving their name, email, why they're interested, and which release stage they want (alpha, beta, release).

## Design intent

The intended way in during invite-only phases (#1's roadmap: Alpha "invite only", Beta "expanded to include friends"). #2 had a working page. #3 kept the backend but removed the page. Protected against bots with reCAPTCHA.

## Rules

- Name, email and reason are required.
- The email must be valid and not already have a request.
- Requests are checked for bots.
- A server admin sees pending requests and approves or rejects them.
- Approving a request emails the person a sign-up link that works once. Rejecting it emails them that the request was declined.

## Scenarios

### Request access

- When a visitor submits their name, email and reason
- Then the request is recorded and they see a confirmation

### Approve a request

- Given "dave" has requested access
- When an admin approves the request
- Then "dave" is emailed a sign-up link, which works once

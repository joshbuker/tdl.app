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

## Scenarios

### Request access

- When a visitor submits their name, email and reason
- Then the request is recorded and they see a confirmation

## Open questions

- How are requests approved and turned into accounts?

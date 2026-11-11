# Billing

Status: Proposed
Release: v1
Related: [Licence and pricing](../../design-decisions/licence-and-pricing.md), [Sign up](sign-up.md), [Self-hosting](../../design-decisions/self-hosting.md)

## Summary

Accounts on tdl.app pay what they want, above a minimum. Admins can give accounts free access, and invites can create accounts with free access.

## Design intent

Pricing starts from day one, so the hosted service covers its costs and paying is normal from the start (see [Licence and pricing](../../design-decisions/licence-and-pricing.md)). The first users, friends and family, are covered by free access rather than by a period with no pricing. Self-hosters run their own servers, so billing is a server setting that is off unless the admin turns it on.

## Rules

- Billing is a server setting. It is on for tdl.app, and off by default on self-hosted servers. With billing off, every account has full access.
- With billing on, an account either pays or has free access.
- A paying account chooses how much to pay, at or above the server's minimum, monthly or yearly. It can change the amount at any time, taking effect from the next payment.
- Admin accounts always have free access.
- An admin can give any account free access, and take it away. Taking it away gives the account time to start paying before anything changes.
- Sign-up invite links and email invites can be set to give free access, so the account starts with it (see [Sign up](sign-up.md)).
- Payments go through a payment provider. The server never stores card details.

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

### Self-hosted server without billing

- Given a self-hosted server with billing off
- When "alice" signs up
- Then she has full access without paying

## Open questions

- What happens when a paying account stops paying: read-only access after a grace period, or something else? Export should always stay possible.
- Is there a free trial before the first payment?

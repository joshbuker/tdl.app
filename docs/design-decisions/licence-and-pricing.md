# Licence and pricing

## Context

TDL App is meant to be self-hostable (see [Self-hosting](self-hosting.md)), and tdl.app will also run a hosted service. Earlier notes (2021 calls with Kurt Apple and other advisors) discussed open source with a paid hosted service, and got conflicting advice on charging from day one versus starting free. #2 and #3 were already licensed AGPLv3, and so is this repository.

## Decision

- **Licence: AGPLv3.** Anyone can run, modify and self-host the app, and anyone running a modified version as a service must share their changes.
- **Pricing for the hosted service at tdl.app: pay what you want, with a minimum, from day one.** Admins, and friends or family an admin chooses, get free access, which is how the first few users are covered (see [Billing](../features/account/billing.md)). Self-hosted servers have billing off unless their admin turns it on.

## Alternatives considered

- **Permissive licence (MIT or Apache 2.0)**: lets others run closed, modified hosted copies.
- **Open-source free tier with a closed premium tier** (2021 business calls): splits the codebase, and works against self-hosting everything.
- **Free hosted service**: no way to cover hosting costs.
- **Free until a public launch**: makes paying a change later, instead of the norm from the start.
- **Fixed per-user pricing** (2021 business calls): simpler to plan around, but a higher barrier for people who just want to try it.

## Consequences

- Every dependency must be compatible with AGPLv3, and free with every feature we use. Open-core or freemium libraries (paid tiers, paid scaling) and source-available licences (FSL, BSL, SSPL) are ruled out, since self-hosting must be free and complete.
- The minimum price, and the payment provider, are decided before launch.
- Billing is part of v1 (see [Launch scope](launch-scope.md)).

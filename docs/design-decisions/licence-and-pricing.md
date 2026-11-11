# Licence and pricing

## Context

TDL App is meant to be self-hostable (see [Self-hosting](self-hosting.md)), and tdl.app will also run a hosted service. Earlier notes (2021 calls with Kurt Apple and other advisors) discussed open source with a paid hosted service, and got conflicting advice on charging from day one versus starting free. #2 and #3 were already licensed AGPLv3, and so is this repository.

## Decision

- **Licence: AGPLv3.** Anyone can run, modify and self-host the app, and anyone running a modified version as a service must share their changes.
- **Pricing for the hosted service at tdl.app: pay what you want, with a minimum.** Self-hosting stays free. Pricing applies once tdl.app is open beyond the first few users (see [Launch scope](launch-scope.md)).

## Alternatives considered

- **Permissive licence (MIT or Apache 2.0)**: lets others run closed, modified hosted copies.
- **Open-source free tier with a closed premium tier** (2021 business calls): splits the codebase, and works against self-hosting everything.
- **Free hosted service**: no way to cover hosting costs.
- **Fixed per-user pricing** (2021 business calls): simpler to plan around, but a higher barrier for people who just want to try it.

## Consequences

- Every dependency must be compatible with AGPLv3.
- The minimum price, and how payment works, are decided before tdl.app opens to the public.

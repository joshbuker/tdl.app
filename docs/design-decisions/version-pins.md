# Version pins

## Context

Earlier attempts pinned some dependency versions to work around problems, and the reasons were easy to lose, leaving pins in place long after they were needed.

## Decision

Any dependency pinned below its latest version records, next to the pin, why it's pinned and what would let it be lifted (e.g. "until upstream fixes issue #123").

## Alternatives considered

- **Pins without reasons**: quicker, but nobody knows later whether it's safe to upgrade.

## Consequences

- Reviewing pins is part of regular dependency updates.

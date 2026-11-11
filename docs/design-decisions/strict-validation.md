# Strict validation

## Context

#2 and #3 rejected invalid input rather than silently changing it: for example, an email with uppercase letters was rejected, not lowercased (see [Account details](../features/account/user-validation.md)). Silent fixes surprise users and hide bugs in clients.

## Decision

Invalid input is rejected with a clear message per field, and never silently changed. The only exception is trimming leading and trailing spaces from titles and names (tasks, lists, tags, subtasks), which users don't intend and can't see.

The same validation runs on the device and on the server, from the shared domain logic.

## Alternatives considered

- **Normalize where harmless** (e.g. lowercasing emails, trimming every field): friendlier in places, but the stored value then differs from what was entered, and each field needs its own rule.

## Consequences

- Clients show validation errors before sending, so the server rarely sees invalid input.
- Any new exception must be added to this record.

# Error contract

## Context

#3's API answered 401 when not logged in, 403 when access was denied, and 404 when a record didn't exist, accepting that 403 reveals a record exists. Attempt #4's specs say a user with no access learns nothing about a record, not even that it exists (see [Visibility-scoped graph](visibility-scoped-graph.md) and [Deep links](../features/app/deep-links.md)).

## Decision

- **401** when the request isn't logged in, or its session or token is no longer valid.
- **404** when the record doesn't exist, or exists but the user can't see it. Both answers are identical.
- **403** only when the user can see the record but their role doesn't allow the action (e.g. a viewer trying to edit), or their account is read-only (see [Billing](../features/account/billing.md)).
- **422** when the input is invalid, with a message per field (see [Strict validation](strict-validation.md)).
- **429** when rate limited, saying when to retry.
- **400**, **413** and **415** when the request itself is malformed: a body that isn't valid JSON, a body over the size limit (1 MiB), or an unsupported content type. They keep their status, with the code `bad-request`, as does any other 4xx the server framework raises.
- Error bodies have one shape across the API and the apps, with a stable code and a translated message.

## Alternatives considered

- **#3's contract (403 for any denied access)**: clearer for debugging, but tells anyone probing IDs which records exist.

## Consequences

- Access checks run before existence is reported, so "not found" and "no access" take the same path.
- Clients can't tell a deleted record from one they lost access to, and treat both as gone.

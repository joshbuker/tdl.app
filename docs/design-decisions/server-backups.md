# Server backups

## Context

Users trust the server with their only copy of shared lists, and devices only hold what each user can see. Losing the server's database would lose data. A Todoist task for an earlier attempt called for database backups for tdl.app.

## Decision

- tdl.app has automated database and attachment backups, kept off the server, and restoring from them is tested regularly.
- Self-hosting documentation explains how to back up and restore a server, and the server makes that easy (e.g. one command to export a consistent backup).
- Backups are in place before anyone other than the author has data on tdl.app.
- Backups contain user content until end-to-end encryption arrives in v2, so they are encrypted before leaving the server, and access to them is restricted. From v2 they contain only encrypted data (see [End-to-end encryption](end-to-end-encryption.md)).

## Alternatives considered

- **Rely on devices' copies**: each device only has what its user can see, and permanently deleted data or attachments may not be on any device.

## Consequences

- Restoring a backup can bring back data deleted after it was taken. This is accepted: permanent deletion leaves no history to reapply. The backup guide tells the admin to re-handle any deletions made since the backup, such as deleted accounts, after a restore.
- Backup retention must respect account deletion and the non-paying retention period (see [Billing](../features/account/billing.md)).

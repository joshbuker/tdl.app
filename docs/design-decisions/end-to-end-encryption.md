# End-to-end encryption

## Context

Tasks hold private plans, notes and conversations. Users should be able to trust that nobody running a server, including tdl.app's own and any self-hosted one, can read them, the way Signal, Proton and 1Password can't read their users' content. #1 to #3 relied on TLS and the server's own access checks. Adding encryption later means re-encrypting all stored data and changing how sync, sharing and the API work, so the design has to allow for it from the start.

Building it for v1 would mean a custom encrypted sync log, a password protocol, key sharing and recovery before any feature works. In late 2026 no ready-made sync engine offered encryption together with role-based sharing (Jazz v2 dropped encryption by default; Evolu has no roles; Automerge's Keyhive and secsync are alpha or beta).

Several earlier choices make it practical: the app is offline first, so graph rules, filtering, sorting and search already run on the device (see [Offline first](offline-first.md)); the server never undoes a link for breaking a graph rule; and reminders are scheduled on each device.

## Decision

Every account is end-to-end encrypted, always, **from v2**. v1 is built so that adding it doesn't need a redesign:

- **The server stays authoritative for access.** It checks every sync against the sharing grants and refuses what the user isn't allowed to do, in v1 and after encryption. Domain rules are one shared implementation that runs on the device (for offline use and instant feedback) and on the server (to enforce them). Encryption adds a second lock, so a compromised server can't read data; it doesn't move permission checks to the device.
- **No v1 feature depends on the server reading task content** (e.g. server-side search, statistics or email digests), so nothing has to be removed when encryption arrives.
- **Sync separates content from routing metadata** along the boundary below, so content can later be encrypted without changing what the server routes on.

From v2:

- **Encrypted on the device:** everything the user writes or decides about their tasks: titles, notes, comments, attachments, subtasks, list and tag names, colors and icons, link reasons and whether a link is hard or soft, schedules, deadlines, prioritize dates, priority, completion, assignment, reminders, settings and history.
- **Visible to the server:** what it needs to route and authorize sync and do housekeeping, and nothing more: record IDs, which account owns each record, which list each task is in, which two tasks each link joins, sharing grants and roles, when a record was trashed, each attachment's record and size, who each notification is for, account details (username, email, login factors, billing state), and when and how much data is synced. Links and list membership are visible so the server can send each person only what they can see; the link's kind and reason stay encrypted.
- **Keys:** each user has a key pair. Each list, task and tag shared separately has its own key, which is given to the people it's shared with, so access to data follows the sharing grants (see [Container and item grants](container-and-item-grants.md)). The server stores keys only in encrypted form, and can't derive them from anything it holds, including the login password.
- **API and MCP:** API tokens carry their own key, and an official client library decrypts on the caller's side. The MCP server runs locally on top of that library (see [API access](../features/app/api-access.md) and [MCP server](../features/app/mcp-server.md)).
- **Recovery:** a recovery key, another logged-in device, or a passkey can restore access. Without any of them, the data is lost (see [End-to-end encryption](../features/app/end-to-end-encryption.md)).

The cryptographic design (algorithms, key derivation, password protocol) is chosen with the stack, using well-reviewed libraries and published protocols rather than anything custom.

## Alternatives considered

- **End-to-end encryption in v1**: delays every feature behind sync, key and recovery work, with no ready-made engine to lean on (see Context).
- **No end-to-end encryption** (#1 to #3): simpler, and lets the server run features on content, but anyone with server access can read everything.
- **Opt-in encryption**: two data paths to build and test, and features that behave differently per list.
- **Encrypt content only**: dates, completion and links would stay readable, so the server could run push reminders or statistics, but it would see the shape and timing of the user's work.
- **Server-run API and MCP with user-granted decryption**: convenient, but breaks the promise that the server can't read content.
- **A user-run bridge** (like 1Password Connect): keeps plaintext off the server, but makes every user who wants automation run extra software.

## Consequences

- Nothing on the server can work with task content: no server-side search, statistics, push reminders, email digests or content in push notifications. Anything like that runs on the device.
- From v2, push notifications carry no readable content, and the device decrypts what it needs to show. In v1 they show the task's title (see [Notifications](../features/app/notifications.md)).
- From v2, admins can manage accounts but can't read or restore anyone's data, and server backups contain only encrypted data. In v1, backups are encrypted before leaving the server (see [Server backups](server-backups.md)).
- Moving to v2 needs a migration that encrypts each user's existing data on their devices, and a recovery key for every existing account.
- The cryptographic design is chosen when v2 work starts, not with the v1 stack.
- Removing someone's access means new keys for what they could see, so they can't read later changes. What they already synced can't be taken back.
- Forgetting the password and losing every device, passkey and the recovery key means losing the data.
- The stack needs well-reviewed cryptography libraries on every platform.

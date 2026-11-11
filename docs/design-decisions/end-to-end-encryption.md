# End-to-end encryption

## Context

Tasks hold private plans, notes and conversations. Users should be able to trust that nobody running a server, including tdl.app's own and any self-hosted one, can read them, the way Signal, Proton and 1Password can't read their users' content. #1 to #3 relied on TLS and the server's own access checks. Adding encryption later would mean re-encrypting all stored data and redesigning sync, sharing and the API, so it has to be part of the design from the start.

Several earlier choices make it practical: the app is offline first, so graph rules, filtering, sorting and search already run on the device (see [Offline first](offline-first.md)); the server never undoes a link for breaking a graph rule; and reminders are scheduled on each device.

## Decision

Every account is end-to-end encrypted, always, from v1.

- **Encrypted on the device:** everything the user writes or decides about their tasks: titles, notes, comments, attachments, subtasks, list and tag names, colors and icons, link reasons, the links themselves, schedules, deadlines, prioritize dates, priority, completion, assignment, reminders, settings and history.
- **Visible to the server:** what it needs to route and authorize sync: record IDs, which account owns each record, sharing grants and roles, account details (username, email, login factors), and when and how much data is synced.
- **Keys:** each user has a key pair. Each list, task and tag shared separately has its own key, which is given to the people it's shared with, so access to data follows the sharing grants (see [Container and item grants](container-and-item-grants.md)). The server stores keys only in encrypted form, and can't derive them from anything it holds, including the login password.
- **API and MCP:** API tokens carry their own key, and an official client library decrypts on the caller's side. The MCP server runs locally on top of that library (see [API access](../features/app/api-access.md) and [MCP server](../features/app/mcp-server.md)).
- **Recovery:** a recovery key, another logged-in device, or a passkey can restore access. Without any of them, the data is lost (see [End-to-end encryption](../features/app/end-to-end-encryption.md)).

The cryptographic design (algorithms, key derivation, password protocol) is chosen with the stack, using well-reviewed libraries and published protocols rather than anything custom.

## Alternatives considered

- **No end-to-end encryption** (#1 to #3): simpler, and lets the server run features on content, but anyone with server access can read everything.
- **Opt-in encryption**: two data paths to build and test, and features that behave differently per list.
- **Encrypt content only**: dates, completion and links would stay readable, so the server could run push reminders or statistics, but it would see the shape and timing of the user's work.
- **Server-run API and MCP with user-granted decryption**: convenient, but breaks the promise that the server can't read content.
- **A user-run bridge** (like 1Password Connect): keeps plaintext off the server, but makes every user who wants automation run extra software.

## Consequences

- Nothing on the server can work with task content: no server-side search, statistics, push reminders, email digests or content in push notifications. Anything like that runs on the device.
- Push notifications carry no readable content. The device decrypts what it needs to show.
- Admins can manage accounts but can't read or restore anyone's data. Server backups contain only encrypted data.
- Removing someone's access means new keys for what they could see, so they can't read later changes. What they already synced can't be taken back.
- Forgetting the password and losing every device, passkey and the recovery key means losing the data.
- The stack needs well-reviewed cryptography libraries on every platform.

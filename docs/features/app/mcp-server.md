# MCP server

Status: Proposed
Release: v1
Related: [API access](api-access.md), [Sharing](sharing.md)

## Summary

AI assistants can read and manage the user's tasks through a Model Context Protocol (MCP) server, with the user's permission.

## Design intent

MCP is the common way for AI assistants (such as Claude) to use outside tools. An MCP server lets the user plan with an assistant: capture tasks from a conversation, ask what's next up, or break a project into linked tasks. It is a thin layer over the [API](api-access.md) and its client library, so it has the same rules and nothing extra to keep in step.

## Rules

- The MCP server runs on the user's own computer, not on the TDL App server, because only the user's devices can decrypt their data (see [End-to-end encryption](end-to-end-encryption.md)). It is built into the desktop app, and also available as a small standalone program.
- It connects to the user's TDL App server with an API token (or the desktop app's own login), which sets read-only or read-write access and can be revoked like any token (see [API access](api-access.md)).
- The MCP server acts as the user, with exactly their access, and follows every rule the app does. Graph rules, such as rejecting a cycle the user can see, return the same explanations as the app.
- It offers tools to search and read tasks and lists, see next up, and create, edit, complete, schedule and link tasks.
- It offers nothing the API doesn't.

## Scenarios

### Connect an assistant

- When "alice" turns on the MCP server in her desktop app and adds it to her assistant with read-write access
- Then the assistant can list her next-up tasks

### Assistant follows the graph rules

- Given "A" is a prerequisite of "B"
- When the assistant tries to make "B" a prerequisite of "A" for "alice"
- Then it is refused with the same cycle explanation the app gives

### Revoke an assistant

- Given "alice" revoked her assistant's access
- When the assistant tries to read her tasks
- Then it is refused

### Standalone program

- When "alice" runs the standalone MCP program with her API token, and adds it to her assistant
- Then the assistant can list her next-up tasks

### Read-only assistant

- Given "alice" connected her assistant with a read-only token
- When the assistant tries to complete "Buy milk"
- Then it is refused

### Assistant acts as its user

- Given "bob" shared "Paint fence" with "alice" as a viewer
- When her assistant tries to complete "Paint fence"
- Then it is refused, as it would be for her in the app

### Assistant creates linked tasks

- When the assistant creates "Buy paint" and makes it a prerequisite of "Paint fence" for "alice"
- Then "alice" sees "Buy paint" linked before "Paint fence" in the app

### No account security actions

- When the assistant tries to change alice's password
- Then it can't, as the API offers no way to

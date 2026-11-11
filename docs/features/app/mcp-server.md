# MCP server

Status: Proposed
Release: v1
Related: [API access](api-access.md), [Sharing](sharing.md)

## Summary

AI assistants can read and manage the user's tasks through a Model Context Protocol (MCP) server, with the user's permission.

## Design intent

MCP is the common way for AI assistants (such as Claude) to use outside tools. An MCP server lets the user plan with an assistant: capture tasks from a conversation, ask what's next up, or break a project into linked tasks. It is a thin layer over the [API](api-access.md), so it has the same rules and nothing extra to keep in step.

## Rules

- Each TDL App server runs its own MCP server, including self-hosted ones, at a well-known address on that server.
- Assistants connect with OAuth: the user logs in and approves read-only or read-write access, which can be revoked like any API token (see [API access](api-access.md)).
- The MCP server acts as the user, with exactly their access, and follows every rule the app does. Graph rules, such as rejecting a cycle the user can see, return the same explanations as the app.
- It offers tools to search and read tasks and lists, see next up, and create, edit, complete, schedule and link tasks.
- It offers nothing the API doesn't.

## Scenarios

### Connect an assistant

- When "alice" adds her TDL App server to her assistant and approves read-write access
- Then the assistant can list her next-up tasks

### Assistant follows the graph rules

- Given "A" is a prerequisite of "B"
- When the assistant tries to make "B" a prerequisite of "A" for "alice"
- Then it is refused with the same cycle explanation the app gives

### Revoke an assistant

- Given "alice" revoked her assistant's access
- When the assistant tries to read her tasks
- Then it is refused

# Tags

Status: Proposed
Release: v1
Related: [Lists](lists.md), [Sharing](../app/sharing.md), [Filtering and sorting](../views/filtering-and-sorting.md)

## Summary

The user applies any number of colored tags to a task and filters by them.

## Design intent

Lists and tags both exist because they answer different questions. A list is where a task lives (exactly one). Tags are cross-cutting contexts (e.g. @Home, @Phone, Priority) that cut across lists. This was the #1 and #2 model. #3 dropped tags during the GTD rework and never brought them back.

Tags are shared the same way as lists and tasks (see [Container and item grants](../../design-decisions/container-and-item-grants.md)). A tag is often a personal context (e.g. @Waiting-Bob), so sharing a task never shares its tags without asking.

## Rules

- Tag titles don't have to be unique. Typing a title that matches several tags offers a choice (see [IDs, not titles](../../design-decisions/ids-not-titles.md)).
- Each tag has one owner: the user who created it.
- A task's tags are one field on the task, holding the IDs of its tags. Changes to it are recorded in the task's history. If two people change a task's tags at the same time while offline, the newest change wins, so one person's added or removed tag is lost. History shows both changes, so it can be redone by hand.
- When the owner deletes a tag, after confirming if any tasks use it, the tag is removed from every task at once. There is no Trash for tags. The tasks' history still shows the tag being added and removed, under its last title (see [Current state and history](../../design-decisions/current-state-and-history.md)).
- A tag is shown on a task only to people who have access to both the task and the tag. Tags the user can't see are not shown, and don't count for their filters.
- The owner can share a tag with other users. They can then see it on tasks they have access to, add it to or remove it from tasks they can edit, and use it on their own tasks. Only the owner can rename, recolor or delete it.
- When the user shares a task or list whose tasks have tags, they are asked which of those tags to share too (see [Sharing](../app/sharing.md)).
- When the user adds a tag to a task that other people can see, they are asked whether to share the tag with them.
- The user's answer is remembered for each tag and person, so they aren't asked about the same tag and person again.
- A tag can be shared or unshared at any time from its menu (e.g. right-click or long-press), including after declining earlier.
- Tags have a color (random by default), an optional icon from the same set as lists, and an order. The icon means a tag doesn't rely on color alone (see [Lists](lists.md)).
- Filtering by tags can require all selected tags, any of them, or none of them.
- Tag filters match by title, ignoring case, so filtering by @Errands matches the user's own "Errands" tag and any "errands" tag shared with them alike.
- A "no tags" filter shows untagged tasks.

## Scenarios

### Filter by any of several tags

- Given "A" is tagged @Home and "B" is tagged @Phone
- When the user filters by @Home or @Phone with "any"
- Then both "A" and "B" are shown

### Filter by all tags

- Given "A" is tagged @Home and @Phone, and "B" is tagged @Home
- When the user filters by @Home and @Phone with "all"
- Then only "A" is shown

### Filter by tag across own and shared tags

- Given "Buy milk" in the user's own list is tagged @Errands, and "Buy paint" in a shared list is tagged with "alice"'s @errands, which she shared with the user
- When the user filters all lists by @Errands
- Then both tasks are shown

### Choose tags to share with a task

- Given "Paint fence" is tagged @House and @Waiting-Bob, both owned by "alice"
- When she shares "Paint fence" with "bob"
- Then she is asked which tags to share
- And if she shares only @House, "bob" sees "Paint fence" tagged @House and not @Waiting-Bob

### Asked when tagging a shared task

- Given "alice" shared "Paint fence" with "bob"
- When she tags it with her tag @Weekend
- Then she is asked whether to share @Weekend with "bob"

### Declining is remembered

- Given "alice" declined to share @Weekend with "bob"
- When she tags another task shared with "bob" with @Weekend
- Then she is not asked again

### Share a tag later

- Given "alice" declined to share @Weekend with "bob"
- When she shares @Weekend with "bob" from its menu
- Then "bob" sees @Weekend on tasks shared with him that have it

### Only the owner renames a shared tag

- Given "alice" shared @House with "bob"
- When "bob" tries to rename @House
- Then he can't

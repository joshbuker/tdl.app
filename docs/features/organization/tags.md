# Tags

Status: Proposed
Related: [Lists](lists.md), [Filtering and sorting](../views/filtering-and-sorting.md)

## Summary

The user applies any number of colored tags to a task and filters by them.

## Design intent

Lists and tags both exist because they answer different questions. A list is where a task lives (exactly one). Tags are cross-cutting contexts (e.g. @Home, @Phone, Priority) that cut across lists. This was the #1 and #2 model. #3 dropped tags during the GTD rework and never brought them back.

## Rules

- Tag titles are unique per user, ignoring case.
- Tags have a color (random by default) and an order.
- Filtering by tags can require all selected tags, any of them, or none of them.
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

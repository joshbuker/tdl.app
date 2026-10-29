# Insert a task between

Status: Proposed
Release: v1
Related: [Link tasks](link-tasks.md)

## Summary

From a linked pair (A before B), the user can insert a task X so that the order becomes A before X before B.

## Design intent

Restructuring the graph is common when a plan gets refined ("oh, I need to do X before B but after A"). Doing it as three manual link edits is tedious and error-prone. #3 built this for prerequisites; the postrequisite side was a "Coming soon" stub. Here it works from either task.

## Rules

- The A to B link is replaced by A to X and X to B, all at once.
- X can be an existing task or a new one.
- It can be started from either task: from A's postrequisites or from B's prerequisites. The result is the same.
- If the new links would break a rule from [Link tasks](link-tasks.md), nothing changes.

## Scenarios

### Insert a new task between two linked tasks

- Given "Buy paint" is a prerequisite of "Paint fence"
- When the user inserts "Sand fence" between them
- Then "Buy paint" comes before "Sand fence", which comes before "Paint fence"
- And "Buy paint" is no longer a direct prerequisite of "Paint fence"

## Open questions

- Do the two new links copy the replaced link's hard or soft setting and reason?

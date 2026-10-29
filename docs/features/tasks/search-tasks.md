# Search tasks

Status: Proposed
Release: v1
Related: [Create a task](create-task.md)

## Summary

The user searches tasks by title, opens a result, or creates a new task from the search text.

## Design intent

Search was in every attempt and doubles as duplicate detection on create. #3 used fuzzy matching with an adaptive delay to stay responsive. #1 had to turn live search off because it was too slow on mobile.

## Rules

- Matching is fuzzy: case-insensitive, tolerant of typos, and matches anywhere in the title or notes.
- Title matches rank above notes matches, and better matches rank higher.
- Results update as the user types without making typing lag.
- If nothing fits, the search text can become a new task.
- Completed tasks can be included or left out.

## Scenarios

### Find a task

- Given tasks "Buy milk" and "Paint fence"
- When the user searches for "MILK"
- Then "Buy milk" is shown and "Paint fence" is not

### Tolerate typos

- Given a task "Paint fence"
- When the user searches for "pant fense"
- Then "Paint fence" is shown

### Title matches rank first

- Given "Call plumber" and "Fix sink" with notes "ask the plumber"
- When the user searches for "plumber"
- Then "Call plumber" is shown above "Fix sink"

### Create from search

- When the user searches for "Call plumber" and nothing matches
- Then the user can create "Call plumber" from the search

# Attachments

Status: Proposed
Release: v1
Related: [End-to-end encryption](../app/end-to-end-encryption.md), [Comments](comments.md), [Offline use](../app/offline.md)

## Summary

Files and photos can be attached to tasks and comments.

## Design intent

Attachments were one of the gaps in Todoist the author cared about (notes: Top Priorities, Todoist Features and TDL App). They're encrypted on the device like everything else, so the server stores them without being able to read them (see [End-to-end encryption](../app/end-to-end-encryption.md)).

## Rules

- Any file can be attached to a task or a comment. Photos can be taken from the camera on devices that have one.
- Attachments are encrypted on the device before upload, and readable by everyone who can see the task or comment.
- Images show a preview. Other files show their name, type and size.
- The server admin sets a maximum size per file and storage per account. The user is told before uploading if a file is too big or would go over their storage.
- Attachments are downloaded when opened, and stay available offline afterwards. Attachments added offline upload when back online.
- Removing an attachment, or permanently deleting its task or comment, deletes the file. A trashed task keeps its attachments.

## Scenarios

### Attach a photo

- When "alice" attaches a photo of the paint color to "Paint fence"
- Then the task shows a preview of the photo

### Too big to upload

- Given the server allows files up to 25 MB
- When "alice" attaches a 40 MB video
- Then she is told it is too big, and nothing is uploaded

### Shared task attachments

- Given "bob" can view "Paint fence", which has a photo attached
- Then "bob" can open the photo

### Attach offline

- Given "alice" is offline
- When she attaches a photo to "Paint fence"
- Then it shows on the task, and uploads once she is back online

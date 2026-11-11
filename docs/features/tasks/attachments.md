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

### Over the storage limit

- Given "alice" has 10 MB of storage left
- When she attaches a 20 MB video
- Then she is told it would go over her storage, and nothing is uploaded

### Remove an attachment

- Given "Paint fence" has a photo attached
- When "alice" removes the photo
- Then it is no longer on the task, and the file is deleted

### Trashed task keeps its attachments

- Given "Paint fence" has a photo attached
- When "alice" moves it to the Trash and restores it
- Then the photo is still attached

### Permanently deleting a task deletes its attachments

- Given "Paint fence" is in the Trash with a photo attached
- When "alice" deletes it permanently
- Then the photo's file is deleted too

### Other files show their details

- When "alice" attaches "quote.pdf" to "Paint fence"
- Then the task shows the file's name, type and size

### Opened attachments stay available offline

- Given "alice" has opened the photo on "Paint fence"
- When she is offline
- Then she can still open the photo

### Attach from the camera

- Given "alice" is using her phone
- When she takes a photo with the camera from "Paint fence"
- Then the photo is attached to the task

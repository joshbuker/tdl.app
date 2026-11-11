# Push relay

## Context

Push notifications to the Android and iOS apps go through Google's Firebase Cloud Messaging and Apple's push service, which only accept them from whoever holds the app publisher's credentials: tdl.app. Self-hosted servers can't send them directly (see [Self-hosting](self-hosting.md) and [Notifications](../features/app/notifications.md)). Some Android users run phones without Google services.

## Decision

- **Relay mode is part of the server code**, turned on for tdl.app. Self-hosted servers that opt in send each notification with its device token to the relay, which forwards it to Google or Apple and stores neither. It's free, and authenticates servers so it can't be used as an open relay.
- In v1 a notification carries the task's title and what happened. From v2 it's encrypted, and the device decrypts it (see [End-to-end encryption](end-to-end-encryption.md)).
- **UnifiedPush** is supported on Android from v1: when a distributor (e.g. ntfy) is installed, the server pushes through it directly, with no Google services and no relay.

## Alternatives considered

- **Content-free wake-ups**: the relay never sees content even in v1, but each app fetches details from its own server, which needs more native code (a notification service extension on iOS), and iOS throttles background wake-ups.
- **A separate relay program**: clearer separation, but another thing to deploy and version.
- **No relay**: self-hosted users would get no pushes on Android or iOS.

## Consequences

- tdl.app carries the relay's traffic for self-hosted servers, and needs rate limits per server.
- Until v2, the relay sees notification content in transit.
- Two push paths on Android to build and test.

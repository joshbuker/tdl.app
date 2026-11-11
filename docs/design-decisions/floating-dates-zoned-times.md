# Floating dates, zoned times

## Context

Schedules and deadlines are shared by everyone with access to a task (see [Sharing](../features/app/sharing.md)), and collaborators can be in different time zones. A date pinned to one person's time zone would span two days for someone elsewhere, while a time with no zone can't be shown correctly to anyone else.

## Decision

- **A date without a time is a calendar date** (e.g. 2026-11-17), with no time zone. It is the same date for everyone, shown with the day of the week, and counts as today when it is today in the viewer's own time zone. This is how calendar apps treat all-day events.
- **A date with a time records the time zone it was set in.** It is one moment, shown in each viewer's own time zone. 15:00 in Tokyo shows as 01:00 the same day in New York.

This applies to schedules, deadlines, prioritize dates and reminders.

They are stored and exchanged as text:

- Dates as ISO 8601 calendar dates: `2026-11-17`.
- Date-times as RFC 9557 strings, which add the time zone name to an RFC 3339 (ISO 8601) timestamp: `2026-11-19T15:00+09:00[Asia/Tokyo]`. The offset pins the exact moment, and the zone name keeps recurring times right across daylight saving changes and future changes to a zone's rules.

## Alternatives considered

- **Dates in the setter's time zone** (earlier #4 draft): a Tokyo Thursday covers parts of two days in New York.
- **Times without a zone ("floating" times)**: 15:00 would be 15:00 wherever each person is, which is wrong for anything tied to a real moment, like a call.
- **ISO 8601 date-times with only a UTC offset** (e.g. `+09:00`): an offset isn't a time zone, so a weekly 09:00 in New York would shift by an hour when daylight saving starts or ends.
- **Everything stored in UTC** (#1 to #3 used a single date-time): forces a time onto date-only plans, and loses the zone the time was meant in.

## Consequences

- Dates and date-times are different types in the domain model, not one timestamp.
- The stack's date library must support RFC 9557 and the IANA time zone database (e.g. JavaScript's Temporal, Java's `ZonedDateTime`).
- Keeping the original zone lets a time be shown as it was meant (e.g. "15:00 Tokyo time") as well as converted.

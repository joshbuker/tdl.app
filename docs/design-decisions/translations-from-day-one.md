# Translations from day one

## Context

#2 and #3 supported English and Japanese from the start, and #3's API checked automatically for missing or unused translations. Adding translations to an app that wasn't built for them means finding every hard-coded string later. v1 ships in English only, with Japanese in v2 (see [Language](../features/account/language.md)).

## Decision

Every user-facing string, including error messages, notifications and date formats, goes through translations from the first line of code. A check in CI fails on missing or unused translation keys.

## Alternatives considered

- **English only until a second language is added**: less work at first, but the retrofit touches every screen.

## Consequences

- Adding Japanese in v2 is translation work, not code changes.
- Natural-language entry is separate: it parses English in v1 (see [Natural-language entry](../features/tasks/natural-language-entry.md)).

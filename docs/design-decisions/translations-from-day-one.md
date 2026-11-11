# Translations from day one

## Context

#2 and #3 supported English and Japanese from the start, and #3's API checked automatically for missing or unused translations. Adding translations to an app that wasn't built for them means finding every hard-coded string later. v1 ships in English only, with Japanese in v2 (see [Language](../features/account/language.md)).

## Decision

Every user-facing string, including error messages, notifications and date formats, goes through translations from the first line of code.

The apps use **vue-i18n**, Quasar's default and what #3 used, with its ESLint plugin's `no-missing-keys` and `no-unused-keys` rules failing CI. Shared domain packages return message keys and parameters (e.g. for graph rule errors), not translated text, so they don't depend on vue-i18n.

## Alternatives considered

- **Paraglide 2**: typed message functions, so a missing key is a type error, and usable outside Vue; but unused keys need a script of our own.
- **i18next with i18next-cli**: framework-agnostic, but unused-key detection was unconfirmed.
- **English only until a second language is added**: less work at first, but the retrofit touches every screen.

## Consequences

- Adding Japanese in v2 is translation work, not code changes.
- Natural-language entry is separate: it parses English in v1 (see [Natural-language entry](../features/tasks/natural-language-entry.md)).
- The server, which sends emails, needs its own way to translate them (e.g. vue-i18n's core library, or the same message files with a small formatter). Decide when emails are built.

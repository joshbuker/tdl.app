# Language

Status: Proposed

## Summary

The user chooses the app's language.

## Design intent

#2 and #3 supported English and Japanese from the start. The #3 API checked for missing or unused translations automatically. Building translation in from day one is much cheaper than adding it later.

## Rules

- Available languages: English and Japanese. English is the default and fallback.
- The choice is saved on the account.
- All user-facing text, including error messages and date formats, is translated.

## Scenarios

### Switch language

- When the user switches to 日本語
- Then the settings title shows "設定"

## Open questions

- Which languages at launch?

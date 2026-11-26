# UI and UX research

Notes for designing how TDL App looks and flows, gathered before the work that polishes the thin slice's plain Quasar UI. These are findings, not decisions: each candidate decision at the end is settled with the author and then recorded in `design-decisions/`. Feature behavior stays in `features/`.

**Status:** first pass on 2026-11-26, covering capture, navigation, offline status, undo, keyboard use and accessibility. Not yet researched is listed at the end. Many sources are vendor or practitioner blogs; the more authoritative ones are W3C, Google's Android and Open Health Stack guidelines, and web.dev.

## Findings

### Quick capture

- **One always-available way to add a task, with nothing to fill in first.** Every extra screen before typing makes people skip the app or forget the task. Details (list, dates, tags) are refined later or parsed from the text.
- **Todoist's redesigned Quick Add (June 2026)** opens empty and shows task actions only after typing starts, keeping natural-language parsing.
- **For TDL App:** the [Create a task](features/tasks/create-task.md) and [Natural-language entry](features/tasks/natural-language-entry.md) specs already point this way. The quick-add input should be reachable from every page, and by thumb on a phone.

Sources: [UX Planet: UX wishlist for to-do apps](https://uxplanet.org/my-ux-wishlist-for-to-do-list-apps-d43f737817bd), [Todoist: a cleaner, simpler Quick Add](https://www.todoist.com/fr/help/todoist/product-updates/a-cleaner-simpler-quick-add-june-29-PuIpiLmLh).

### Navigation and layout across screen sizes

- **Material's window size classes:** every screen is compact (phones), medium (small tablets, foldables) or expanded (tablets, desktops). Layout and navigation change by class, not by device.
- **Navigation by size:** a bottom navigation bar on compact screens, a navigation rail (a narrow strip of icons, expandable to show labels) on medium and larger. Material 3 Expressive (2025) deprecates the navigation drawer in favour of the expandable rail, and replaces the bottom bar with a shorter "flexible" one. This came from 2025 coverage and SAP's Material-based design system; check material.io before relying on it.
- **Thumb reach and parity:** an app that needs two hands gets opened less. Phone layouts should adapt features for touch, not remove them, which matches the "same features on every platform" rule in [Platforms](features/app/platforms.md).
- **For TDL App:** Quasar's `QLayout` supports a bottom bar (`QFooter` with tabs) and a drawer with a narrow "mini" mode, which can serve as a rail. The thin slice uses a drawer everywhere.

Sources: [Android: build adaptive navigation](https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation), [Android codelab: adaptive layout with Material](https://developer.android.com/codelabs/adaptive-material-guidance), [9to5Google: Material 3 Expressive navigation](https://9to5google.com/2025/05/14/material-3-expressive-navigation/), [SAP Fiori for Android: navigation rail](https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-rail/usage).

### Offline and sync status

- **Being offline isn't an error.** Don't style connectivity status like a failure. Show it calmly, in plain words rather than jargon such as "app offline".
- **Distinguish offline from failed:** if a sync fails because the device is offline, say offline; if it fails for another reason, say it failed.
- **Status where it matters:** an indicator on the key screens, not progress spinners everywhere. Per-record states (saved on this device, synced, couldn't sync) help when it matters which changes went up.
- **Act locally at once** (optimistic UI), syncing in the background, and never lose what the user wrote: show what couldn't sync instead of dropping it.
- **For TDL App:** the slice's sync status and "couldn't sync" page already follow most of this; review their wording and styling against these points.

Sources: [Google Open Health Stack: offline and sync design guidelines](https://developers.google.com/open-health-stack/design/offline-sync-guideline), [web.dev: offline UX design guidelines](https://web.dev/offline-ux-design-guidelines), [A List Apart: designing offline-first web apps](https://alistapart.com/article/offline-first/), [AppMaster: offline-first sync, conflicts and retries UX](https://appmaster.io/blog/offline-first-background-sync-conflict-retries-ux).

### Undo instead of confirmation

- **For reversible actions, act at once and offer undo** (a toast for about 5 to 7 seconds), rather than asking "Are you sure?". People click through confirmations by habit, so they don't protect much.
- **Keep confirmations for what can't be undone,** or has consequences people may not expect: deleting an account, revoking a device, discarding unsynced changes.
- **Optimistic changes need a way back:** if the server later refuses a change, the UI must show it rather than silently reverting.
- **For TDL App:** [Undo](features/tasks/undo.md) and [Delete a task](features/tasks/delete-task.md) cover the behavior. The logout dialog's "discard unsynced changes" is a correct use of a confirmation.

Sources: [Andy Matuschak: prefer undo to confirmation steps](https://notes.andymatuschak.org/zXH4ASvHNz488hCNgrBjQJK), [Smashing Magazine: managing dangerous actions](https://smashingmagazine.com/2024/09/how-manage-dangerous-actions-user-interfaces), [elementary HIG: always provide an undo](https://docs.elementary.io/hig/user-workflow/always-provide-an-undo).

### Keyboard use and the command palette

- **One shortcut opens a command palette from anywhere** (usually Ctrl or Cmd+K). When empty it shows recent items; it puts the best match first, acts on the current context (e.g. "Add task" on a list adds to that list), and shows each command's own shortcut so people learn them.
- **Mnemonic shortcuts** (Linear: S for status, P for priority; "G then …" to go somewhere) and a searchable cheat sheet on `?`.
- **For TDL App:** [Keyboard shortcuts](features/app/keyboard-shortcuts.md) is the spec to check these against.

Sources: [Superhuman: how to build a remarkable command palette](https://blog.superhuman.com/how-to-build-a-remarkable-command-palette/), [Retool: designing the command palette](https://retool.com/blog/designing-the-command-palette), [Knock: how to design great keyboard shortcuts](https://knock.app/blog/how-to-design-great-keyboard-shortcuts), [Linear: keyboard-first features](https://linear.app/features/level-up).

### Accessibility (WCAG 2.2)

WCAG 2.2 (a W3C Recommendation since October 2023) is the current web accessibility standard; level AA is the usual target. The criteria most relevant here:

- **Target size (2.5.8, AA):** pointer targets at least 24×24 CSS pixels, or spaced so they don't overlap; 44×44 (the AAA level) is better on touch screens.
- **Focus (2.4.7, 2.4.11):** a visible focus indicator, and a focused control never hidden entirely by sticky headers, footers or bars.
- **Dragging (2.5.7, AA):** anything done by dragging (reordering, the board and graph views, scheduling) also has a single-tap or button alternative.
- **Keyboard (2.1.1, 2.1.2):** every control reachable with Tab and Shift+Tab, with no traps.
- **For TDL App:** no spec or decision covers accessibility yet. Quasar's components handle much of it, but custom views (graph, board, calendar) and the mobile bottom bar need checking. Automated checks (e.g. axe in the Playwright tests) catch part of it.

Sources: [W3C: what's new in WCAG 2.2](https://w3.org/WAI/standards-guidelines/wcag/new-in-22/), [WebAIM: WCAG 2.2 checklist](https://webaim.org/standards/wcag/wcag22), [Deque: WCAG 2.2 for native mobile](https://www.deque.com/blog/what-wcag-2-2-means-for-native-mobile-accessibility/).

## Candidate decisions

To settle with the author, then record in `design-decisions/`:

- **Accessibility target:**
  - **WCAG 2.2 AA,** with 44×44 touch targets on phones, and automated checks in the Playwright tests.
  - **AA only where Quasar gives it for free,** checked by hand before launch.
  - **No formal target** for v1's few users.
- **Navigation pattern:**
  - **Adaptive:** a bottom bar on phones, a rail (expandable) on tablets and desktops, following Material 3.
  - **A drawer everywhere,** as the slice has now (and as #3 had).
- **Design system:**
  - **Quasar's Material look,** themed with TDL App's own colours and type.
  - **Material 3 tokens** (colour roles, type scale, shapes) applied to Quasar's components.
  - **An own design system** on top of Quasar.
- **Undo or confirm:** undo for every reversible action, confirmations only for the irreversible ones listed above, or confirmations as each spec says today.
- **Command palette:** add one (Ctrl/Cmd+K) to the [Keyboard shortcuts](features/app/keyboard-shortcuts.md) spec, or keep to shortcuts.

## Not yet researched

- How Things 3, TickTick, OmniFocus and current Todoist handle capture, lists and review (this pass found little on Things 3).
- Nielsen Norman Group's research on these topics, as a more authoritative source than vendor blogs.
- Comparing design systems in practice (Material 3, Apple's Human Interface Guidelines for iOS, Fluent), and how far Quasar supports Material 3.
- Visual design: typography, colour, dark mode, density, motion.
- Mobile gestures (swipe to complete or schedule), and how they meet the dragging criterion.
- Empty states and first use, onboarding.
- Graph and dependency views: how other tools show prerequisites and "next up".
- Notifications and reminders UX.

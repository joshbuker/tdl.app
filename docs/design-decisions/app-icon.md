# App icon

## Context

The Quasar app came with Quasar's own logo as its favicon and app icons. Attempt #3 had a custom icon: a neon light bulb with a brain inside, on a black square. Only some of #3's icon files were replaced, so it still showed Quasar's logo in most places. Every platform needs its own sizes and formats: browser tabs, home screens, Android launchers and desktop apps.

## Decision

- **The icon is #3's light bulb,** taken unchanged from its largest copy (`historical-versions/web.tdl.app/public/icons/android-chrome-512x512.png`). It's kept as `apps/client/icongenie/icon.png`. It's temporary, until the logo is revisited.
- **Quasar's Icon Genie generates every size** from that one image (`pnpm icons` in `apps/client`). The generated files are committed as generated, in their own commit, like other generated Quasar files.
- **Icon Genie is a dev dependency, with a licence exception for `potrace`.** Icon Genie is MIT, but it depends on `potrace`, which is GPL-2.0. That isn't compatible with AGPLv3, so `licence-policy.json` lists it as an exception. It's acceptable because it only runs on a developer's machine to make images: none of its code ships in the app, and the images it makes aren't covered by its licence.

## Alternatives considered

- **Running Icon Genie once with `pnpm dlx`**, without a dependency: no exception needed, but regenerating, e.g. for Android and Electron in plan 4, would depend on someone remembering the command.
- **Our own script with sharp or ImageMagick:** no GPL tool at all, but we'd maintain the list of sizes and formats that Icon Genie already knows.
- **A favicon-generator website,** as #3 did: its output didn't match Quasar's file names, which is why #3 ended up with a mix of icons.
- **Cleaning up the image:** it's opaque, with a faint checkerboard baked into its black background. Flattening it to black left faint squares inside the glow, and smoothing them softened the neon tubes.
- **Redrawing it as an SVG:** gave true transparency and any size, but didn't capture the original's full, densely folded brain.

## Consequences

- The icon is a dark square everywhere, as in #3, with the faint checkerboard visible only up close.
- Changing the icon means replacing `apps/client/icongenie/icon.png` and running `pnpm icons` again.
- Plan 4 reuses the same source and command for the Capacitor and Electron modes.
- Revisit the logo later: ideally a source with real transparency, at 1024 px or more, which Icon Genie recommends.

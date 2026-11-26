# Version pins

Dependencies pinned below their latest version, why, and what would lift each pin (see [Version pins](docs/design-decisions/version-pins.md)).

| Dependency | Pinned to | Latest | Why | Lift when |
| --- | --- | --- | --- | --- |
| `typescript` (root and `apps/client`) | 6.0.3 | 7.0.2 | typescript-eslint (8.72.2) supports TypeScript below 6.1 only, and its type-aware rules need it. The client matches the root. | typescript-eslint supports TypeScript 7. |
| pnpm (`packageManager`) | 12.9.0 | 12.18.0 | Matches the pnpm that `shell.nix` gets from nixos-unstable, so local and CI installs agree. | nixos-unstable ships a newer pnpm; bump `packageManager` to match. |
| `drizzle-orm` | 1.0.0-rc.5 | 1.0.0-rc.5 (release candidate) | Pinned to the 1.0 release candidate until 1.0 is stable (see [Drizzle](docs/design-decisions/drizzle.md)). | Drizzle 1.0 is stable. |
| `drizzle-kit` | 1.0.0-rc.5 | 1.0.0-rc.5 (release candidate) | Must match `drizzle-orm`; same release candidate pin. | Drizzle 1.0 is stable; lift together with `drizzle-orm`. |
| `@playwright/test` (`apps/client`) | 1.64.1 | 1.65.0 | Must match nixpkgs' `playwright-driver`, whose browsers `shell.nix` provides (Playwright's own downloads don't run on NixOS). | nixos-unstable updates `playwright-driver`; bump to its version. |
| `@sqlite.org/sqlite-wasm` (`apps/client`) | 3.54.1-build1 | 3.54.1-build1 | Every release carries a `-buildN` prerelease tag, and semver ranges don't match prereleases of other versions, so a range wouldn't follow it. Pinned exactly and bumped by hand. | The package publishes plain versions; then use a caret range. |
| `@quasar/mcp` (`.mcp.json`) | 1.1.0 | 1.1.0 | `.mcp.json` runs it with `npx`, outside pnpm's lockfile, release-age check and licence check, so the exact version keeps what runs fixed. | Never: bump it by hand, after checking the new version's licence (MIT for 1.1.0) and that it is a few days old, as pnpm's `minimumReleaseAge` would. |

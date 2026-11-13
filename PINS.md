# Version pins

Dependencies pinned below their latest version, why, and what would lift each pin (see [Version pins](docs/design-decisions/version-pins.md)).

| Dependency | Pinned to | Latest | Why | Lift when |
| --- | --- | --- | --- | --- |
| `typescript` (root and `apps/client`) | 6.0.3 | 7.0.2 | typescript-eslint (8.72.2) supports TypeScript below 6.1 only, and its type-aware rules need it. The client matches the root. | typescript-eslint supports TypeScript 7. |
| pnpm (`packageManager`) | 12.9.0 | 12.18.0 | Matches the pnpm that `shell.nix` gets from nixos-unstable, so local and CI installs agree. | nixos-unstable ships a newer pnpm; bump `packageManager` to match. |
| `drizzle-orm` | 1.0.0-rc.5 | 1.0.0-rc.5 (release candidate) | Pinned to the 1.0 release candidate until 1.0 is stable (see [Drizzle](docs/design-decisions/drizzle.md)). | Drizzle 1.0 is stable. |
| `drizzle-kit` | 1.0.0-rc.5 | 1.0.0-rc.5 (release candidate) | Must match `drizzle-orm`; same release candidate pin. | Drizzle 1.0 is stable; lift together with `drizzle-orm`. |
| `@playwright/test` (`apps/client`) | 1.64.1 | 1.65.0 | Must match nixpkgs' `playwright-driver`, whose browsers `shell.nix` provides (Playwright's own downloads don't run on NixOS). | nixos-unstable updates `playwright-driver`; bump to its version. |

# Version pins

Dependencies pinned below their latest version, why, and what would lift each pin (see [Version pins](docs/design-decisions/version-pins.md)).

| Dependency | Pinned to | Latest | Why | Lift when |
| --- | --- | --- | --- | --- |
| `typescript` | 6.0.3 | 7.0.2 | typescript-eslint (8.72.2) supports TypeScript below 6.1 only, and its type-aware rules need it. | typescript-eslint supports TypeScript 7. |
| pnpm (`packageManager`) | 12.9.0 | 12.18.0 | Matches the pnpm that `shell.nix` gets from nixos-unstable, so local and CI installs agree. | nixos-unstable ships a newer pnpm; bump `packageManager` to match. |

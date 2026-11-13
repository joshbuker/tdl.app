# Nix development shell

## Context

The author develops on more than one machine, including NixOS, and doesn't want project tools (a specific Node version, pnpm, global packages) installed machine-wide. Attempt #4 needs Node 26, which a machine's default Node may not match.

## Decision

The repository has a `shell.nix` that provides everything needed to develop: Node 26, pnpm and Playwright's browsers, from the nixos-unstable channel (fetched from `channels.nixos.org`, so it doesn't depend on which nixpkgs a machine's system uses). Running `nix-shell` in the repository gives the tools without installing them globally. In an interactive shell it switches to zsh.

- pnpm keeps its package store inside the repository (`store-dir` in the repository's `.npmrc`, git-ignored), so installs don't touch the rest of the machine.
- Nothing is installed globally. Tools the project needs are either in `shell.nix` or project dependencies run through pnpm.
- CI uses the Node version from `.node-version`, which matches `shell.nix`.
- Playwright runs nixpkgs' browsers (`playwright-driver.browsers`, through `PLAYWRIGHT_BROWSERS_PATH`), because the browsers Playwright downloads don't run on NixOS. So `@playwright/test` is pinned to nixpkgs' `playwright-driver` version (see `PINS.md`). CI downloads Playwright's own browsers instead.

## Alternatives considered

- **A version manager** (nvm, fnm, mise): per-user, not per-repository, and they don't cover non-Node tools.
- **A pinned nixpkgs tarball** (a fixed commit and its sha256): every machine gets the exact same versions, but the pin has to be bumped by hand and lags behind unstable's package updates.
- **The system's `<nixpkgs>`**: no extra download, but it's whatever release the machine runs (e.g. 26.05), which can lag a long way behind (pnpm 11 there, 12 on unstable).
- **A Nix flake**: more reproducible with a lock file, but flakes are still marked experimental. Can be adopted later.
- **Dev containers**: full isolation, but heavier, and less pleasant for day-to-day editing.

## Consequences

- Contributors need Nix, or must install Node 26 and pnpm themselves.
- Nix re-fetches unstable after its cache expires (an hour by default), so tool versions move with unstable, and two machines can briefly differ. `.node-version` and `packageManager` in `package.json` hold the versions CI uses.
- Upgrading Node's major version means updating both `shell.nix` and `.node-version`.

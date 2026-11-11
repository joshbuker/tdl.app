# Nix development shell

## Context

The author develops on more than one machine, including NixOS, and doesn't want project tools (a specific Node version, pnpm, global packages) installed machine-wide. Attempt #4 needs Node 26, which a machine's default Node may not match.

## Decision

The repository has a `shell.nix` that provides everything needed to develop: Node 26 and pnpm, from a pinned nixpkgs. Running `nix-shell` in the repository gives the same tools on any machine, without installing them globally.

- pnpm keeps its package store inside the repository (`store-dir` in the repository's `.npmrc`, git-ignored), so installs don't touch the rest of the machine.
- Nothing is installed globally. Tools the project needs are either in `shell.nix` or project dependencies run through pnpm.
- CI uses the Node version from `.node-version`, which matches `shell.nix`.

## Alternatives considered

- **A version manager** (nvm, fnm, mise): per-user, not per-repository, and they don't cover non-Node tools.
- **A Nix flake**: more reproducible with a lock file, but flakes are still marked experimental. Can be adopted later.
- **Dev containers**: full isolation, but heavier, and less pleasant for day-to-day editing.

## Consequences

- Contributors need Nix, or must install Node 26 and pnpm themselves.
- Upgrading Node means updating both `shell.nix` and `.node-version`.

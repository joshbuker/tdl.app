# Development shell: Node 26, pnpm and Playwright's browsers from the nixos-unstable channel.
# See docs/design-decisions/nix-dev-shell.md.
{ pkgs ? import (fetchTarball "https://channels.nixos.org/nixos-unstable/nixexprs.tar.xz") {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs_26
    pkgs.pnpm
    # Matches the pinned @playwright/test (see PINS.md).
    pkgs.playwright-driver.browsers
  ];

  shellHook = ''
    export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
    export PATH="$PWD/node_modules/.bin:$PATH"
    # Playwright uses nixpkgs' browsers; its own downloads don't run on NixOS.
    export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
    export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true

    if [[ $- == *i* ]]; then
      exec zsh
    fi
  '';
}

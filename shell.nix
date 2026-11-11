# Development shell: Node 26 and pnpm from the nixos-unstable channel.
# See docs/design-decisions/nix-dev-shell.md.
{ pkgs ? import (fetchTarball "https://channels.nixos.org/nixos-unstable/nixexprs.tar.xz") {} }:

pkgs.mkShell {
  buildInputs = [
    pkgs.nodejs_26
    pkgs.pnpm
  ];

  shellHook = ''
    export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
    export PATH="$PWD/node_modules/.bin:$PATH"

    if [[ $- == *i* ]]; then
      exec zsh
    fi
  '';
}

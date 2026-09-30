#!/usr/bin/env bash
set -euo pipefail

package=${1:?Usage: build-manylinux.sh <cargo-package>}
case "$package" in
    symbol-nem-wallet-core-node|symbol-nem-wallet-core-native) ;;
    *) printf 'ERROR: unsupported Cargo package: %s\n' "$package" >&2; exit 2 ;;
esac

command -v docker >/dev/null 2>&1 || { echo 'ERROR: docker is required' >&2; exit 1; }
command -v rustc >/dev/null 2>&1 || { echo 'ERROR: rustc is required' >&2; exit 1; }

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
toolchain=$(rustc -Vv | sed -n 's/^release: //p')
test -n "$toolchain"

docker run --rm \
    --env RUST_TOOLCHAIN="$toolchain" \
    --env CARGO_PACKAGE="$package" \
    --volume "$repo_root:/workspace" \
    --workdir /workspace \
    quay.io/pypa/manylinux_2_28_x86_64:latest \
    bash -lc '
      set -euo pipefail
      curl --fail --silent --show-error --location https://sh.rustup.rs | sh -s -- -y --profile minimal
      source "$HOME/.cargo/env"
      rustup toolchain install "$RUST_TOOLCHAIN" --profile minimal --target x86_64-unknown-linux-gnu
      cargo +"$RUST_TOOLCHAIN" build --package "$CARGO_PACKAGE" --target x86_64-unknown-linux-gnu --release --locked
    '

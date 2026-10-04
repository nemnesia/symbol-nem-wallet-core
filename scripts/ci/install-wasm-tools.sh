#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"

if (($# < 1 || $# > 2)); then
    echo 'Usage: scripts/ci/install-wasm-tools.sh [wasm-bindgen|all] [install-root]' >&2
    exit 2
fi
mode=$1
install_root=${2:-}
command -v cargo >/dev/null 2>&1 || { echo 'ERROR: cargo is required' >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo 'ERROR: node is required' >&2; exit 1; }
version=$(node scripts/wasm-bindgen-version.mjs)
if [[ -n "$install_root" ]]; then
    if [[ -n "${GITHUB_PATH:-}" ]]; then
        printf '%s/bin\n' "$install_root" >> "$GITHUB_PATH"
    fi
fi

install_wasm_bindgen() {
    if [[ -n "$install_root" ]]; then
        cargo install wasm-bindgen-cli --version "$version" --locked --root "$install_root"
    else
        cargo install wasm-bindgen-cli --version "$version" --locked
    fi
}

install_wasm_pack() {
    if [[ -n "$install_root" ]]; then
        cargo install wasm-pack --version 0.15.0 --locked --root "$install_root"
    else
        cargo install wasm-pack --version 0.15.0 --locked
    fi
}

case "$mode" in
    wasm-bindgen|all)
        install_wasm_bindgen
        ;;
    *)
        echo "ERROR: unsupported WASM tool group: $mode" >&2
        exit 2
        ;;
esac
if [[ "$mode" == all ]]; then
    install_wasm_pack
fi

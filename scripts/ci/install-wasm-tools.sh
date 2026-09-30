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
install_args=()
if [[ -n "$install_root" ]]; then
    install_args=(--root "$install_root")
    if [[ -n "${GITHUB_PATH:-}" ]]; then
        printf '%s/bin\n' "$install_root" >> "$GITHUB_PATH"
    fi
fi

case "$mode" in
    wasm-bindgen|all)
        cargo install wasm-bindgen-cli --version "$version" --locked "${install_args[@]}"
        ;;
    *)
        echo "ERROR: unsupported WASM tool group: $mode" >&2
        exit 2
        ;;
esac
if [[ "$mode" == all ]]; then
    cargo install wasm-pack --version 0.15.0 --locked "${install_args[@]}"
fi

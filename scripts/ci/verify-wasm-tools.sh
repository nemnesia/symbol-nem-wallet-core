#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"
command -v wasm-pack >/dev/null 2>&1 || { echo 'ERROR: wasm-pack is required' >&2; exit 1; }
version=$(wasm-pack --version | awk '{print $2}')
[[ "$version" == 0.15.0 ]] || { echo 'ERROR: wasm-pack 0.15.0 is required' >&2; exit 1; }
node scripts/verify-wasm-bindgen.mjs

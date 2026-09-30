#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"

for tool in node npm cargo wasm-bindgen; do
    command -v "$tool" >/dev/null 2>&1 || { printf 'ERROR: %s is required\n' "$tool" >&2; exit 1; }
done

temporary_directory=$(mktemp -d)
cleanup() { rm -rf "$temporary_directory"; }
trap cleanup EXIT

node scripts/test-npm-package.mjs
bash scripts/ci/pack-npm-package.sh "$temporary_directory"
shopt -s nullglob
tarballs=("$temporary_directory"/*.tgz)
if ((${#tarballs[@]} != 1)); then
    echo 'ERROR: npm pack must produce exactly one tarball' >&2
    exit 1
fi
bash scripts/ci/npm-consumer.sh "${tarballs[0]}"

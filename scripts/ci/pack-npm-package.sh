#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"
if (($# != 1)); then
    echo 'Usage: scripts/ci/pack-npm-package.sh <output-directory>' >&2
    exit 2
fi
output_directory=$1
mkdir -p "$output_directory"
npm pack --json --ignore-scripts --pack-destination "$output_directory" ./packages/wallet-core > "$output_directory/pack.json"
mapfile -t tarballs < <(find "$output_directory" -maxdepth 1 -type f -name '*.tgz' -print)
if ((${#tarballs[@]} != 1)); then
    echo 'ERROR: npm pack must produce exactly one tarball' >&2
    exit 1
fi
rm "$output_directory/pack.json"

#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$repo_root"

if (($# != 1)); then
    echo "Usage: scripts/ci/npm-consumer.sh <package-tarball.tgz|directory>" >&2
    exit 2
fi
command -v node >/dev/null 2>&1 || { echo "ERROR: node is required" >&2; exit 1; }

tarball=$1
if [[ -d "$tarball" ]]; then
    shopt -s nullglob
    tarballs=("$tarball"/*.tgz)
    if ((${#tarballs[@]} != 1)); then
        printf 'ERROR: expected exactly one .tgz package in %s (found %s)\n' "$tarball" "${#tarballs[@]}" >&2
        exit 1
    fi
    tarball=${tarballs[0]}
fi

node scripts/test-npm-consumer.mjs --tarball "$tarball"
